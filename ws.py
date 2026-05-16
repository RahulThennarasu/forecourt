"""WebSocket fan-out to the dashboard.

voice.py / conversation.py call broadcast(event); it ships the event to every
connected dashboard client. No-op when no clients are connected (the common
case during local development and tests).

main.py owns the /ws endpoint that calls register / unregister.
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

_clients: set[WebSocket] = set()


async def register(websocket: WebSocket) -> None:
    await websocket.accept()
    _clients.add(websocket)


def unregister(websocket: WebSocket) -> None:
    _clients.discard(websocket)


async def broadcast(event: dict[str, Any]) -> None:
    """Send to all connected clients. Dropped clients are pruned. Never raises."""
    if not _clients:
        return
    dead: list[WebSocket] = []
    for client in list(_clients):
        try:
            await client.send_json(event)
        except Exception:
            dead.append(client)
    for client in dead:
        _clients.discard(client)
