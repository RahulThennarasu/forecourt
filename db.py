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
        # Call lifecycle records — one row per call. Inserted on /voice match,
        # updated when the guest signals closing. ended_at and ended_reason
        # stay NULL for calls that hang up abruptly (no closing detected).
        conn.execute(
            "CREATE TABLE IF NOT EXISTS calls ("
            " call_sid TEXT PRIMARY KEY,"
            " guest_name TEXT NOT NULL,"
            " phone_suffix TEXT,"
            " started_at TEXT NOT NULL,"
            " ended_at TEXT,"
            " ended_reason TEXT"
            ")"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_calls_started_at ON calls(started_at DESC)"
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


def log_call_start(
    call_sid: str,
    guest_name: str,
    phone_suffix: str,
    db_path: str = DB_PATH,
) -> None:
    """Insert a call record. Fire-and-forget via BackgroundTasks. Idempotent —
    if Twilio fires /voice twice for the same CallSid (Primary + Fallback),
    the second INSERT is silently absorbed by ON CONFLICT DO NOTHING.
    """
    try:
        with sqlite3.connect(db_path) as conn:
            conn.execute(
                "INSERT INTO calls (call_sid, guest_name, phone_suffix, started_at)"
                " VALUES (?, ?, ?, ?)"
                " ON CONFLICT(call_sid) DO NOTHING",
                (
                    call_sid,
                    guest_name,
                    phone_suffix,
                    datetime.datetime.now(datetime.timezone.utc).isoformat(),
                ),
            )
            conn.commit()
    except sqlite3.Error:
        logger.exception("log_call_start failed sid=%s", call_sid)


def log_call_end(
    call_sid: str,
    reason: str,
    db_path: str = DB_PATH,
) -> None:
    """Stamp a call's ended_at + reason. Fire-and-forget. No-op if the row
    doesn't exist (e.g., walk-in call that never inserted a row at /voice).
    """
    try:
        with sqlite3.connect(db_path) as conn:
            conn.execute(
                "UPDATE calls SET ended_at = ?, ended_reason = ?"
                " WHERE call_sid = ? AND ended_at IS NULL",
                (
                    datetime.datetime.now(datetime.timezone.utc).isoformat(),
                    reason,
                    call_sid,
                ),
            )
            conn.commit()
    except sqlite3.Error:
        logger.exception("log_call_end failed sid=%s", call_sid)


def list_calls(limit: int = 50, db_path: str = DB_PATH) -> list[dict]:
    """Return recent calls (newest first). Read on demand by the /calls endpoint —
    no per-turn reads, no impact on the latency budget.
    """
    try:
        with sqlite3.connect(db_path) as conn:
            rows = conn.execute(
                "SELECT call_sid, guest_name, phone_suffix, started_at, ended_at, ended_reason"
                " FROM calls ORDER BY started_at DESC LIMIT ?",
                (int(limit),),
            ).fetchall()
    except sqlite3.Error:
        logger.exception("list_calls failed")
        return []
    return [
        {
            "call_sid": r[0],
            "guest_name": r[1],
            "phone_suffix": r[2],
            "started_at": r[3],
            "ended_at": r[4],
            "ended_reason": r[5],
        }
        for r in rows
    ]
