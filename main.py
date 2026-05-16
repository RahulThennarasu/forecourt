"""FastAPI app entrypoint for Threshold.

Boot order at startup:
  1. db.init_db()              — ensure SQLite schema exists
  2. data.seed_tanaka_profile() — insert demo guest if missing
  3. data.load_guests_from_db() — populate in-memory GUESTS dict
  4. Verify audio/opening_tanaka.mp3 exists (log error if not — do NOT generate)
  5. Log one-line summary

After startup the hot path is purely in-memory:
  phone → lookup_guest → build_system_prompt → Claude → ElevenLabs → Twilio.
SQLite is never read during a turn (CLAUDE.md latency budget).
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import db
import ws
from data import load_guests_from_db, seed_philip_profile, seed_tanaka_profile
from synthesis import ensure_opening_hook
from voice import router as voice_router

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="threshold")

# Demo CORS — the Vite dashboard runs on a different origin (:5173) and needs
# to hit /calls and friends. WebSockets aren't subject to the same browser
# preflight, which is why /ws worked without this.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve cached audio (opening hook MP3s, fake-live offer fallback) under /audio.
# Twilio dereferences these public URLs via the ngrok tunnel.
AUDIO_DIR = Path("audio")
AUDIO_DIR.mkdir(exist_ok=True)
app.mount("/audio", StaticFiles(directory=str(AUDIO_DIR)), name="audio")

app.include_router(voice_router)


@app.get("/calls")
async def list_calls(limit: int = 50) -> dict:
    """Recent calls (newest first). Read on demand by the dashboard's
    past-calls panel — no impact on the per-turn latency budget.
    """
    return {"calls": db.list_calls(limit=limit)}


@app.get("/calls/{call_sid}")
async def get_call(call_sid: str) -> dict:
    """One call's full detail (metadata + turns + actions) for the history
    view in the dashboard. 404s if the call_sid is unknown.
    """
    detail = db.get_call_detail(call_sid)
    if detail is None:
        raise HTTPException(status_code=404, detail="call not found")
    return detail


@app.on_event("startup")
async def startup() -> None:
    db.init_db()
    seed_tanaka_profile()
    seed_philip_profile()
    n = load_guests_from_db()
    demo = os.environ.get("DEMO_MODE", "false").strip().lower() == "true"
    logger.info(
        "Loaded %d guest profiles into memory. Demo mode: %s.",
        n,
        "true" if demo else "false",
    )

    hook = AUDIO_DIR / "opening_tanaka.mp3"
    if not hook.exists():
        logger.info("opening hook missing — attempting auto-generation via ElevenLabs")
        generated = await ensure_opening_hook(AUDIO_DIR)
        if generated is None:
            logger.error(
                "Missing %s and auto-generation failed (no ELEVENLABS_API_KEY or "
                "API error). Live calls will play silence at pickup until this is fixed.",
                hook,
            )
        else:
            logger.info("opening hook generated at %s", generated)


@app.get("/")
async def root() -> dict:
    return {"status": "ok", "service": "threshold"}


WS_KEEPALIVE_INTERVAL_S = 25


async def _ws_keepalive(websocket: WebSocket) -> None:
    """Send a tiny app-level ping every ~25s so intermediaries (ngrok, browser
    proxies) don't close the socket as idle. The client silently discards
    ping frames — they should not trigger any UI re-render."""
    try:
        while True:
            await asyncio.sleep(WS_KEEPALIVE_INTERVAL_S)
            await websocket.send_json({"type": "ping"})
    except Exception:
        # Connection closed mid-sleep, or any other send failure. The main
        # /ws handler is in charge of cleanup; just exit quietly.
        return


@app.websocket("/ws")
async def ws_endpoint(websocket: WebSocket) -> None:
    await ws.register(websocket)
    keepalive = asyncio.create_task(_ws_keepalive(websocket))
    try:
        while True:
            # Dashboard is receive-only; receive_text() blocks until disconnect.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        keepalive.cancel()
        ws.unregister(websocket)
