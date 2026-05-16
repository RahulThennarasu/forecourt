"""SQLite schema for Threshold. Canonical source of truth.

Per CLAUDE.md: SQLite is NEVER read during a turn. The guests table is read
once at startup by data.load_guests_from_db(). The actions table is written
to via fire-and-forget BackgroundTasks during calls; reads only happen for
the post-call briefing card.
"""

from __future__ import annotations

import datetime
import json
import logging
import sqlite3
import uuid

logger = logging.getLogger(__name__)

DB_PATH = "threshold.db"


def init_db(db_path: str = DB_PATH) -> None:
    """Create all tables idempotently. Safe to call on every startup."""
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS guests ("
            " phone TEXT PRIMARY KEY,"
            " profile_json TEXT NOT NULL"
            ")"
        )
        conn.execute(
            "CREATE TABLE IF NOT EXISTS actions ("
            " id TEXT PRIMARY KEY,"
            " call_sid TEXT NOT NULL,"
            " ts TEXT NOT NULL,"
            " type TEXT NOT NULL,"
            " payload_json TEXT NOT NULL"
            ")"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_actions_call_sid ON actions(call_sid)"
        )
        conn.commit()


def log_action(
    call_sid: str,
    action_type: str,
    payload: dict,
    db_path: str = DB_PATH,
) -> None:
    """Insert a single action. Designed to run via FastAPI BackgroundTasks
    so it never blocks a /respond turn (CLAUDE.md latency budget: writes are
    fire-and-forget). Never raises — failures are logged and swallowed.
    """
    try:
        with sqlite3.connect(db_path) as conn:
            conn.execute(
                "INSERT INTO actions (id, call_sid, ts, type, payload_json)"
                " VALUES (?, ?, ?, ?, ?)",
                (
                    str(uuid.uuid4()),
                    call_sid,
                    datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    action_type,
                    json.dumps(payload, separators=(",", ":")),
                ),
            )
            conn.commit()
    except sqlite3.Error:
        logger.exception("log_action failed sid=%s type=%s", call_sid, action_type)
