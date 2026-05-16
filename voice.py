"""Twilio /voice webhook — inbound call entrypoint.

Twilio POSTs here when a call connects. We look up the caller, store call
state, fire a WebSocket event for the dashboard, and return TwiML that plays
the pre-generated opening hook MP3 then <Gather>s the guest's first words.

Per CLAUDE.md: this handler must respond in under 200ms. No audio synthesis
here — the opening hook is pre-rendered at server startup and served via the
/audio static mount.
"""

from __future__ import annotations

import asyncio
import html
import json
import logging
import time
from pathlib import Path
from urllib.parse import parse_qs

from fastapi import APIRouter, BackgroundTasks, Request
from fastapi.responses import PlainTextResponse

import db
import ws
from conversation import build_system_prompt, call_claude
from data import LOCAL_CONTEXT, lookup_guest
from demo_scripts import get_demo_turn
from guard import redact_leaks
from synthesis import synthesize

# Used when the leak guard fires: deflect rather than risk a surveillance-feel
# leak reaching the audio. Mirrors the prompt's "let the team confirm" escape.
SAFE_DEFLECTION = "Let me have the team confirm that and follow up by text."

logger = logging.getLogger(__name__)

router = APIRouter()

# CallSid -> {"guest": dict | None, "history": list}
# The conversation loop (/respond, separate task) reads from this so it never
# has to re-lookup mid-call. Walk-ins are tracked with guest=None so /respond
# can still find the call.
active_calls: dict[str, dict] = {}

OPENING_HOOK_URL = "/audio/opening_meyer.mp3"
RESPOND_ACTION = "/respond"

# speechTimeout="1" — fixed 1s of trailing silence before Twilio POSTs to
# /respond. Tighter than "auto" (~1.5-2s typical), saves perceived latency.
# Tradeoff: cuts off if the guest pauses >1s mid-sentence. Bump back to
# "auto" if you hit that.
# timeout="6" — if the guest doesn't start speaking within 6s, fall through
# to the verb AFTER the Gather (a <Hangup/> in /respond) so the call ends
# cleanly instead of hanging open.
GATHER = (
    f'<Gather input="speech" action="{RESPOND_ACTION}" method="POST" '
    f'speechTimeout="1" timeout="6" language="en-US"/>'
)

# Per-turn synthesized audio. Served via the /audio static mount in main.py.
TURNS_DIR = Path("audio/turns")

# How long to wait between returning TwiML (audio ready on disk) and
# broadcasting the agent_turn event to the dashboard. Accounts for Twilio's
# fetch + buffer + playback start latency over ngrok — the bubble lands when
# the caller hears the voice instead of ~500ms before.
AGENT_BROADCAST_DELAY_S = 0.5


async def _broadcast_after(delay_s: float, event: dict) -> None:
    """Fire-and-forget: sleep, then broadcast. Used to sync agent_turn arrival
    on the dashboard with the moment audio starts playing on the call."""
    try:
        await asyncio.sleep(delay_s)
        await ws.broadcast(event)
    except Exception:
        logger.exception("delayed broadcast failed")

# When the guest's utterance reads as a closing, /respond returns Play + Hangup
# (no Gather) so the agent's last line plays, then the call ends cleanly.
# Long utterances that happen to contain "thanks" don't terminate — they're
# probably "thanks for that, but also…"
_CLOSING_TRIGGERS = (
    "thank you", "thanks", "that's all", "thats all", "that is all",
    "we're good", "were good", "we are good", "all set", "we're all set",
    "bye", "goodbye", "good bye", "see you", "talk to you later",
    "appreciate it", "cheers", "perfect thanks", "great thanks",
)


def _is_closing_utterance(speech: str) -> bool:
    s = (speech or "").lower().strip()
    if not s:
        return False
    if len(s.split()) > 8:
        return False
    return any(trigger in s for trigger in _CLOSING_TRIGGERS)


async def _twilio_form(request: Request) -> dict[str, str]:
    """Parse Twilio's form-encoded POST without depending on python-multipart."""
    if request.method == "GET":
        return {k: v for k, v in request.query_params.items()}
    body = await request.body()
    parsed = parse_qs(body.decode("utf-8"))
    return {k: v[0] for k, v in parsed.items() if v}


def _twiml(body: str) -> PlainTextResponse:
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>'
    return PlainTextResponse(content=xml, media_type="application/xml")


@router.post("/voice")
@router.get("/voice")
async def voice(request: Request, background: BackgroundTasks) -> PlainTextResponse:
    form = await _twilio_form(request)
    call_sid = form.get("CallSid", "")
    from_number = form.get("From", "")

    guest = lookup_guest(from_number)
    phone_suffix = from_number[-4:] if from_number else ""

    started_at = time.monotonic()
    if guest is not None:
        active_calls[call_sid] = {
            "guest": guest,
            "history": [],
            "started_at": started_at,
        }
        logger.info(
            "call_started sid=%s name=%s phone_suffix=%s",
            call_sid, guest["name"], phone_suffix,
        )
        # Persist the call record. Idempotent — Twilio's Primary+Fallback fire
        # pattern won't create duplicates (ON CONFLICT DO NOTHING).
        background.add_task(db.log_call_start, call_sid, guest["name"], phone_suffix)
        # Fire-and-forget so we hit the <200ms budget even if the dashboard is slow.
        asyncio.create_task(ws.broadcast({
            "type": "call_started",
            "call_sid": call_sid,
            "guest_name": guest["name"],
            "phone_suffix": phone_suffix,
        }))
        return _twiml(f'<Play>{OPENING_HOOK_URL}</Play>{GATHER}')

    # Walk-in: no profile, no demo fallback. Track the call so /respond can
    # still find it, but skip the call_started WS event per spec.
    active_calls[call_sid] = {
        "guest": None,
        "history": [],
        "started_at": started_at,
    }
    logger.info(
        "call_started sid=%s name=walk-in phone_suffix=%s",
        call_sid, phone_suffix,
    )
    return _twiml(
        '<Say voice="Polly.Joanna">Welcome to Rosewood. '
        'May I help you arrange your arrival?</Say>'
        f'{GATHER}'
    )


@router.post("/respond")
async def respond(request: Request, background: BackgroundTasks) -> PlainTextResponse:
    """One conversational turn.

    Twilio's <Gather> POSTs here after the guest finishes speaking. We pull
    call state from active_calls, call Claude with the running history, parse
    the structured response, synthesize audio via ElevenLabs, and return
    TwiML that plays the audio + Gathers the next utterance.

    Latency target: <2s end-to-end (CLAUDE.md). The hot path here is
    Claude (~800ms) + ElevenLabs (~600ms). Action logging is fire-and-forget
    via BackgroundTasks; the WebSocket broadcast uses asyncio.create_task.
    """
    form = await _twilio_form(request)
    call_sid = form.get("CallSid", "")
    speech = form.get("SpeechResult", "").strip()

    state = active_calls.get(call_sid)
    if state is None:
        # Orphan: server restarted mid-call, or unknown CallSid. End gracefully.
        logger.warning("orphan_respond sid=%s", call_sid)
        return _twiml(
            '<Say voice="Polly.Joanna">Sorry, the line broke up. '
            'Please call us back when you have a moment.</Say><Hangup/>'
        )

    # Stamp the moment we received the guest's speech — close to "when the
    # guest stopped talking". Used as the guest-side timestamp for the dashboard.
    guest_ts = max(0, int(time.monotonic() - (state.get("started_at") or time.monotonic())))

    # Empty speech (rare with speechTimeout=auto, but Twilio can fire action
    # with no SpeechResult after long silence). Re-prompt briefly.
    if not speech:
        logger.info("empty_speech sid=%s — re-gathering", call_sid)
        return _twiml(
            '<Say voice="Polly.Joanna">Are you still there?</Say>'
            f'{GATHER}<Hangup/>'
        )

    guest = state["guest"]
    history: list[dict] = state["history"]
    history.append({"role": "user", "content": speech})
    turn_n = (len(history) + 1) // 2  # 1-indexed exchange number

    # If the guest just signalled closing, this turn is the last one — the
    # agent will speak its goodbye and Twilio will hang up immediately after,
    # no trailing 6s silence wait on the Gather.
    is_closing = _is_closing_utterance(speech)

    # Fire the guest_turn event RIGHT NOW so the dashboard renders the guest
    # bubble while Claude + ElevenLabs are still working. The matching
    # agent_turn (below) carries the same turn_number so the dashboard fills
    # the same row in with the agent's reply when it's ready.
    asyncio.create_task(ws.broadcast({
        "type": "guest_turn",
        "call_sid": call_sid,
        "turn_number": turn_n,
        "ts_seconds": guest_ts,
        "speech": speech,
    }))
    # Persist for the history view. Fire-and-forget; never blocks the turn.
    background.add_task(db.log_turn, call_sid, turn_n, "guest", speech, guest_ts)

    try:
        # Deterministic demo script path (bypasses Claude) for repeatable demos.
        demo_script = guest.get("demo_script") if isinstance(guest, dict) else None
        if demo_script:
            demo_turn = get_demo_turn(str(demo_script), turn_n - 1)
            if demo_turn is None:
                system_prompt = build_system_prompt(guest, LOCAL_CONTEXT)
                raw, say_text, actions = await call_claude(system_prompt, history)
            else:
                say_text = demo_turn["say"]
                actions = demo_turn.get("actions", [])
                raw = f"<say>{say_text}</say><actions>{json.dumps(actions)}</actions>"
        else:
            system_prompt = build_system_prompt(guest, LOCAL_CONTEXT)
            raw, say_text, actions = await call_claude(system_prompt, history)
    except Exception:
        logger.exception("claude_call_failed sid=%s", call_sid)
        # Roll back the user message so retry on the next turn isn't double-counted.
        history.pop()
        # The dashboard already rendered the guest bubble — emit a matching
        # agent_turn carrying the deflection so the row finalises instead of
        # hanging forever as guest-only. Delayed so it lands with the audio.
        fail_ts = max(guest_ts, int(time.monotonic() - (state.get("started_at") or time.monotonic())))
        asyncio.create_task(_broadcast_after(AGENT_BROADCAST_DELAY_S, {
            "type": "agent_turn",
            "call_sid": call_sid,
            "turn_number": turn_n,
            "ts_seconds": fail_ts,
            "say": SAFE_DEFLECTION,
            "actions": [],
            "leaks": [],
        }))
        background.add_task(db.log_turn, call_sid, turn_n, "agent", SAFE_DEFLECTION, fail_ts)
        return _twiml(
            f'<Say voice="Polly.Joanna">{html.escape(SAFE_DEFLECTION)}</Say><Hangup/>'
        )

    history.append({"role": "assistant", "content": raw})

    # Hard backstop: scan say_text for profile facts the guest hasn't given a
    # hook for. Two outcomes:
    #   - core leak (surveillance-feel: origin city, flight number, past room,
    #     anniversary unprompted, etc.): redact_leaks returns None — replace
    #     the entire reply with a deflection and drop all actions, since the
    #     offer was likely built around the leaked fact.
    #   - side leak only (dietary, wine_pref): redact_leaks returns the same
    #     reply with the offending word removed in place ("vegetarian dinner"
    #     -> "dinner"). The anticipatory offer survives and we keep the
    #     associated actions; only the leaky word is silenced.
    cleaned, leaks = redact_leaks(say_text, guest, history)
    if leaks:
        if cleaned is None:
            logger.warning(
                "profile_leak_core sid=%s labels=%s leaked_text=%r",
                call_sid, leaks, say_text,
            )
            say_text = SAFE_DEFLECTION
            actions = []
            history[-1] = {
                "role": "assistant",
                "content": f"<say>{SAFE_DEFLECTION}</say><actions>[]</actions>",
            }
        else:
            logger.warning(
                "profile_leak_redacted sid=%s labels=%s before=%r after=%r",
                call_sid, leaks, say_text, cleaned,
            )
            say_text = cleaned
            history[-1] = {
                "role": "assistant",
                "content": f"<say>{cleaned}</say><actions>{json.dumps(actions)}</actions>",
            }
        # Visibility on the dashboard — staff should know the guard caught it.
        asyncio.create_task(ws.broadcast({
            "type": "leak_guard",
            "call_sid": call_sid,
            "labels": leaks,
        }))

    logger.info(
        "turn sid=%s guest_words=%d say_words=%d actions=%d leaks=%d",
        call_sid, len(speech.split()), len(say_text.split()), len(actions), len(leaks),
    )

    # Persist + broadcast actions (never block the response).
    for action in actions:
        atype = action.get("type", "")
        payload = action.get("payload", {})
        if not atype:
            continue
        background.add_task(db.log_action, call_sid, atype, payload)
        asyncio.create_task(ws.broadcast({
            "type": "action",
            "call_sid": call_sid,
            "action": action,
        }))

    # Matching agent_turn — finalises the row in the dashboard. Carries the
    # same turn_number as the earlier guest_turn so the view fills in the same
    # entry. Timestamp captured AFTER synthesis so it reflects when the audio
    # is actually ready to play. Broadcast is delayed by AGENT_BROADCAST_DELAY_S
    # to sync visually with Twilio's fetch + buffer + playback start.
    started_at = state.get("started_at") or time.monotonic()
    agent_ts = max(guest_ts, int(time.monotonic() - started_at))
    asyncio.create_task(_broadcast_after(AGENT_BROADCAST_DELAY_S, {
        "type": "agent_turn",
        "call_sid": call_sid,
        "turn_number": turn_n,
        "ts_seconds": agent_ts,
        "say": say_text,
        "actions": actions,
        "leaks": leaks,
    }))
    # Persist the agent side of the turn for the history view.
    background.add_task(db.log_turn, call_sid, turn_n, "agent", say_text, agent_ts)

    # Synthesize the spoken reply. Fall back to Polly if ElevenLabs fails.
    # On a closing turn the trailing TwiML is just <Hangup/> — no <Gather>,
    # so the call ends as soon as the agent's goodbye finishes playing
    # instead of waiting 6s for more silence.
    trailer = "<Hangup/>" if is_closing else f"{GATHER}<Hangup/>"
    turn_n = len(history) // 2  # one user + one assistant per turn
    audio_path = TURNS_DIR / f"{call_sid}_{turn_n}.mp3"
    try:
        await synthesize(say_text, audio_path)
        play_url = f"/audio/turns/{audio_path.name}"
        body = f'<Play>{play_url}</Play>{trailer}'
    except Exception:
        logger.exception("elevenlabs_failed sid=%s — falling back to Polly", call_sid)
        body = (
            f'<Say voice="Polly.Joanna">{html.escape(say_text)}</Say>'
            f'{trailer}'
        )

    if is_closing:
        # Tell the dashboard the call has wrapped. Fire-and-forget so it never
        # blocks the TwiML response.
        asyncio.create_task(ws.broadcast({
            "type": "call_ended",
            "call_sid": call_sid,
            "ts_seconds": agent_ts,
            "reason": "guest_closed",
        }))
        # Persist the end-of-call so /calls shows the duration in the history.
        background.add_task(db.log_call_end, call_sid, "guest_closed")

    return _twiml(body)
