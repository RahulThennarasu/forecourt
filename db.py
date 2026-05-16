"""SQLite schema for Threshold. Canonical source of truth.

Per CLAUDE.md: SQLite is NEVER read during a turn. The guests table is read
once at startup by data.load_guests_from_db(). The actions table is written
to via fire-and-forget BackgroundTasks during calls; reads only happen for
the post-call briefing card.
"""

from __future__ import annotations

import sqlite3

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
