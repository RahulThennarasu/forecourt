"""ElevenLabs text-to-speech for the Threshold voice pipeline.

Uses Turbo v2.5 + a warm female preset voice (Charlotte by default).
HTTP-only via urllib — no SDK dep. Synthesized MP3s are saved to disk and
served via the /audio static mount; Twilio fetches them by URL.

Per CLAUDE.md latency budget: each synthesis call should complete in under
600ms. The synchronous urllib call is wrapped with asyncio.to_thread so the
FastAPI event loop isn't blocked.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from pathlib import Path

import asyncio

logger = logging.getLogger(__name__)

# "Charlotte" — warm female preset, suits a luxury concierge. Override via env.
VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "XB0fDUnXU5powFXDhCwa")
MODEL_ID = os.environ.get("ELEVENLABS_MODEL_ID", "eleven_turbo_v2_5")

# Phone-quality output — smaller payload than studio 44k. Twilio downsamples
# everything to 8kHz on its end anyway, so we lose nothing.
OUTPUT_FORMAT = "mp3_22050_32"

ELEVENLABS_TIMEOUT_S = 10


def _sync_synthesize(text: str, out_path: Path) -> None:
    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY not set")
    url = (
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}"
        f"?output_format={OUTPUT_FORMAT}"
    )
    body = json.dumps({
        "text": text,
        "model_id": MODEL_ID,
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": "audio/mpeg",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=ELEVENLABS_TIMEOUT_S) as resp:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with out_path.open("wb") as f:
            f.write(resp.read())


async def synthesize(text: str, out_path: Path) -> Path:
    """Async TTS. Returns the output path on success; raises on failure."""
    await asyncio.to_thread(_sync_synthesize, text, out_path)
    return out_path


def ensure_opening_hook(audio_dir: Path) -> Path | None:
    """Generate audio/opening_tanaka.mp3 if missing. Best-effort.

    Returns the path on success, None on failure (key missing, API error, etc.).
    Caller logs the outcome — we do not want startup to crash if ElevenLabs is
    down.
    """
    hook = audio_dir / "opening_tanaka.mp3"
    if hook.exists():
        return hook
    if not os.environ.get("ELEVENLABS_API_KEY"):
        return None
    text = (
        "Good evening, Mr. Tanaka. This is the Rosewood Sand Hill arrival "
        "concierge. How can I help you prepare for your stay?"
    )
    try:
        _sync_synthesize(text, hook)
        return hook
    except (urllib.error.URLError, RuntimeError, OSError):
        logger.exception("Failed to generate opening hook")
        return None
