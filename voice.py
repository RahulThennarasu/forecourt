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
import logging
from urllib.parse import parse_qs

from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse

import ws
from data import lookup_guest

logger = logging.getLogger(__name__)

router = APIRouter()

# CallSid -> {"guest": dict | None, "history": list}
# The conversation loop (/respond, separate task) reads from this so it never
# has to re-lookup mid-call. Walk-ins are tracked with guest=None so /respond
# can still find the call.
active_calls: dict[str, dict] = {}

OPENING_HOOK_URL = "/audio/opening_tanaka.mp3"
RESPOND_ACTION = "/respond"

GATHER = (
    f'<Gather input="speech" action="{RESPOND_ACTION}" method="POST" '
    f'speechTimeout="auto" language="en-US"/>'
)


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
