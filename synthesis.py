"""ElevenLabs text-to-speech for the Threshold voice pipeline.

Uses Flash v2.5 + a warm female preset voice (Charlotte by default). HTTP via
httpx with a persistent connection pool — TLS handshake happens once per
process, not once per turn. Synthesized MP3s are saved to disk and served via
the /audio static mount; Twilio fetches them by URL.

Per CLAUDE.md latency budget: each synthesis call should complete in under
600ms. With optimize_streaming_latency=3 and Flash, we usually beat 400ms.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

# "Charlotte" — warm female preset, suits a luxury concierge. Override via env.
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "XB0fDUnXU5powFXDhCwa")
# Flash v2.5 is the lowest-latency model; quality difference vs Turbo is
# negligible at 8kHz phone audio. Override to eleven_turbo_v2_5 if you prefer
# slightly more natural cadence on a non-phone test.
MODEL_ID = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_flash_v2_5")

# Phone-quality output — smaller payload than studio 44k.
OUTPUT_FORMAT = "mp3_22050_32"

# 0 = max quality, 4 = max speed. 3 trades a small amount of cadence smoothness
# for a meaningful TTFT drop — right balance for a phone call.
OPTIMIZE_STREAMING_LATENCY = 3

ELEVENLABS_TIMEOUT_S = 10

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    """Singleton AsyncClient — keeps the TLS connection to api.elevenlabs.io
    warm across calls, saving ~150-300ms per turn after the first.
    """
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            timeout=ELEVENLABS_TIMEOUT_S,
            limits=httpx.Limits(max_connections=10, keepalive_expiry=60.0),
            http2=False,  # ElevenLabs streaming MP3 works fine on HTTP/1.1
        )
    return _client


async def _async_synthesize(text: str, out_path: Path) -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not set")
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        f"?output_format={OUTPUT_FORMAT}"
        f"&optimize_streaming_latency={OPTIMIZE_STREAMING_LATENCY}"
    )
    client = _get_client()
    resp = await client.post(
        url,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        json={
            "text": text,
            "model_id": MODEL_ID,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
        },
    )
    resp.raise_for_status()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(resp.content)


async def synthesize(text: str, out_path: Path) -> Path:
    """Async TTS. Returns the output path on success; raises on failure."""
    await _async_synthesize(text, out_path)
    return out_path


OPENING_HOOK_FILENAME = "opening_meyer.mp3"


async def ensure_opening_hook(audio_dir: Path) -> Path | None:
    """Generate audio/opening_meyer.mp3 if missing. Best-effort.

    The opening greets the active demo guest (Mr. Meyer) by name and is
    rendered through ElevenLabs so callers hear the same warm voice as the
    rest of the conversation — never Twilio's default Polly fallback.

    Returns the path on success, None on failure (key missing, API error,
    etc.). Caller logs the outcome — we do not want startup to crash if
    ElevenLabs is down.
    """
    hook = audio_dir / OPENING_HOOK_FILENAME
    if hook.exists():
        return hook
    if not os.environ.get("ELEVENLABS_API_KEY"):
        return None
    text = (
        "Good evening, Mr. Meyer. This is the Rosewood Sand Hill arrival "
        "concierge. How can I help you prepare for your stay?"
    )
    try:
        await _async_synthesize(text, hook)
        return hook
    except (httpx.HTTPError, RuntimeError, OSError):
        logger.exception("Failed to generate opening hook")
        return None
