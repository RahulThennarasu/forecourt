"""In-memory guest store and today's local context for Rosewood Sand Hill.

GUESTS is populated at server startup via load_guests_from_db(). During a call
we only do dict lookups against this — never SQLite. Enforced by the CLAUDE.md
latency budget: per-turn guest lookup must be under 5ms.

LOCAL_CONTEXT is hardcoded for the demo. In a real deployment this would come
from the property management system; the demo does not have one.
"""

from __future__ import annotations

import json
import os
import sqlite3

# db.py will own the canonical path constant once it lands; until then,
# data.py is the single source.
DB_PATH = "threshold.db"

GUESTS: dict[str, dict] = {}

LOCAL_CONTEXT: dict = {
    "weather": {"temp_f": 68, "conditions": "clear", "sunset": "19:42"},
    "sommelier_pick": "Sancerre, Loire Valley 2021",
    "on_duty": {
        "chef": "Chef Marie",
        "notes": "known for quiet anniversary surprises",
    },
    "events": ["Live jazz on the patio 18:00-20:00"],
    "facilities": [
        "Madera restaurant",
        "Sense spa",
        "patio",
        "pool",
        "tennis courts",
    ],
}


def _tanaka_profile() -> dict:
    phone = os.environ.get("DEMO_PHONE_NUMBER", "+14086100377")
    return {
        "phone": phone,
        "name": "Mr. Tanaka",
        "past_stays": [
            {
                "date": "2023-09",
                "context": "engagement weekend",
                "room": "corner suite with oak tree view",
            },
            {
                "date": "2024-03",
                "context": "business trip",
                "room": "standard king",
            },
        ],
        "preferences": {
            "dining": [
                "wife is vegetarian",
                "prefers Sancerre",
                "quiet seating",
            ],
            "room": ["68F", "extra duvet"],
            "schedule": ["early breakfast on business trips"],
        },
        "flight_today": {"number": "UA241", "from": "HND", "eta": "16:32 PT"},
        "notable": "anniversary this weekend",
    }

def _philip_profile() -> dict:
    """Philip Meyer demo profile (used for the 'philip' demo script)."""
    phone = os.environ.get("DEMO_PHILIP_PHONE_NUMBER", "+16505550142")
    return {
        "phone": phone,
        "name": "Philip Meyer",
        "title": "Regional Vice President & Managing Director",
        "room_type": "Santa Cruz Mountain-View Suite (Presidents Wing)",
        "notable": "Corporate executive guest · deeply familiar with Sand Hill ops",
        "preferences": {
            "wellness": [
                "elite endurance cycling",
                "5:30 AM wheels-up",
                "high-sodium hydration profile",
            ],
            "dining": [
                "low-stimulus dining after board calls",
                "Chef’s Counter alcove at Madera",
                "fluid seating windows",
            ],
        },
        # Used by voice.py to trigger deterministic demo responses.
        "demo_script": "philip",
    }


def _ensure_guests_table(conn: sqlite3.Connection) -> None:
    # Defensive guard so data.py works even if db.init_db() wasn't called first
    # (e.g., in a test repl). db.py owns the canonical schema.
    conn.execute(
        "CREATE TABLE IF NOT EXISTS guests ("
        " phone TEXT PRIMARY KEY,"
        " profile_json TEXT NOT NULL"
        ")"
    )


def seed_tanaka_profile(db_path: str = DB_PATH) -> None:
    """Insert the canonical Tanaka demo guest into SQLite if not already present."""
    profile = _tanaka_profile()
    with sqlite3.connect(db_path) as conn:
        _ensure_guests_table(conn)
        already = conn.execute(
            "SELECT 1 FROM guests WHERE phone = ?", (profile["phone"],)
        ).fetchone()
        if already:
            return
        conn.execute(
            "INSERT INTO guests (phone, profile_json) VALUES (?, ?)",
            (profile["phone"], json.dumps(profile)),
        )
        conn.commit()

def seed_philip_profile(db_path: str = DB_PATH) -> None:
    """Insert the Philip Meyer demo guest into SQLite if not already present."""
    profile = _philip_profile()
    with sqlite3.connect(db_path) as conn:
        _ensure_guests_table(conn)
        already = conn.execute(
            "SELECT 1 FROM guests WHERE phone = ?", (profile["phone"],)
        ).fetchone()
        if already:
            return
        conn.execute(
            "INSERT INTO guests (phone, profile_json) VALUES (?, ?)",
            (profile["phone"], json.dumps(profile)),
        )
        conn.commit()


def load_guests_from_db(db_path: str = DB_PATH) -> int:
    """Populate GUESTS from SQLite. Returns the count loaded. Call once at startup."""
    GUESTS.clear()
    with sqlite3.connect(db_path) as conn:
        _ensure_guests_table(conn)
        rows = conn.execute("SELECT phone, profile_json FROM guests").fetchall()
    for phone, profile_json in rows:
        GUESTS[phone] = json.loads(profile_json)
    return len(GUESTS)


def _demo_mode() -> bool:
    return os.environ.get("DEMO_MODE", "false").strip().lower() == "true"


def lookup_guest(phone_number: str) -> dict | None:
    """Exact match first; in DEMO_MODE, fall back to the Tanaka profile. None on miss.

    Priority: exact match → demo-mode fallback → None.

    Per CLAUDE.md latency budget: must complete under 5ms. This is a dict .get()
    plus one env read on the fallback path. No I/O.
    """
    hit = GUESTS.get(phone_number)
    if hit is not None:
        return hit
    if _demo_mode():
        which = os.environ.get("DEMO_GUEST", "tanaka").strip().lower()
        if which == "philip":
            demo_phone = os.environ.get("DEMO_PHILIP_PHONE_NUMBER", "+16505550142")
            return GUESTS.get(demo_phone) or _philip_profile()
        demo_phone = os.environ.get("DEMO_PHONE_NUMBER", "+14086100377")
        return GUESTS.get(demo_phone) or _tanaka_profile()
    return None
