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
from guard import check_leaks
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

OPENING_HOOK_URL = "/audio/opening_tanaka.mp3"
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
async def voice(request: Request) -> PlainTextResponse:
    form = await _twilio_form(request)
    call_sid = form.get("CallSid", "")
    from_number = form.get("From", "")

    guest = lookup_guest(from_number)
    phone_suffix = from_number[-4:] if from_number else ""

    if guest is not None:
        active_calls[call_sid] = {"guest": guest, "history": []}
        logger.info(
            "call_started sid=%s name=%s phone_suffix=%s",
            call_sid, guest["name"], phone_suffix,
        )
        # Fire-and-forget so we hit the <200ms budget even if the dashboard is slow.
        asyncio.create_task(ws.broadcast({
            "type": "call_started",
            "call_sid": call_sid,
            "guest_name": guest["name"],
        }))
        return _twiml(f'<Play>{OPENING_HOOK_URL}</Play>{GATHER}')

    # Walk-in: no profile, no demo fallback. Track the call so /respond can
    # still find it, but skip the call_started WS event per spec.
    active_calls[call_sid] = {"guest": None, "history": []}
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

    try:
        system_prompt = build_system_prompt(guest, LOCAL_CONTEXT)
        raw, say_text, actions = await call_claude(system_prompt, history)
    except Exception:
        logger.exception("claude_call_failed sid=%s", call_sid)
        # Roll back the user message so retry on the next turn isn't double-counted.
        history.pop()
        return _twiml(
            '<Say voice="Polly.Joanna">Let me have the team look into that '
            'and follow up by text. Have a good rest of your day.</Say><Hangup/>'
        )

    history.append({"role": "assistant", "content": raw})

    # Hard backstop: scan say_text for profile facts the guest hasn't given a
    # hook for. On any leak, replace with a deflection and drop all actions
    # (the offer was likely built around the leaked fact). The leaky raw
    # response is also rewritten in history so the next turn doesn't anchor
    # on its bad output.
    leaks = check_leaks(say_text, guest, history)
    if leaks:
        logger.warning(
            "profile_leak sid=%s labels=%s leaked_text=%r",
            call_sid, leaks, say_text,
        )
        say_text = SAFE_DEFLECTION
        actions = []
        history[-1] = {
            "role": "assistant",
            "content": f"<say>{SAFE_DEFLECTION}</say><actions>[]</actions>",
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

    # Synthesize the spoken reply. Fall back to Polly if ElevenLabs fails.
    turn_n = len(history) // 2  # one user + one assistant per turn
    audio_path = TURNS_DIR / f"{call_sid}_{turn_n}.mp3"
    try:
        await synthesize(say_text, audio_path)
        play_url = f"/audio/turns/{audio_path.name}"
        body = f'<Play>{play_url}</Play>{GATHER}<Hangup/>'
    except Exception:
        logger.exception("elevenlabs_failed sid=%s — falling back to Polly", call_sid)
        body = (
            f'<Say voice="Polly.Joanna">{html.escape(say_text)}</Say>'
            f'{GATHER}<Hangup/>'
        )

    return _twiml(body)
