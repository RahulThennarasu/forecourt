"""Deterministic demo scripts for voice calls.

Used to make hackathon demos repeatable: given a guest profile with a
`demo_script` value, voice.py can bypass the LLM and return a scripted
assistant reply + actions for a turn whose triggers match what the guest
just said.

Matching is keyword-driven, NOT positional. A script row fires only when one
of its `triggers` substrings is present in the guest's transcript. If no row
matches the current utterance — e.g. the guest throws a curveball like
"fireworks at 10 PM" — get_demo_turn returns None and voice.py falls back to
the live Claude path so the system actually responds appropriately.

Each scripted row may only fire once per call. voice.py tracks used indices
on the call's state dict, so the same scripted response can't double-fire if
the guest re-uses a trigger word.
"""

from __future__ import annotations


PHILIP_TURNS: list[dict] = [
    {
        # Arrival / check-in turn.
        "user_hint": "arriving / check in",
        "triggers": ["arriv", "check in", "check-in", "checkin", "landing", "land"],
        "say": (
            "Welcome back, Mr. Meyer. Your Mountain-View Suite is pre-keyed — "
            "we'll do private in-villa check-in so you can head straight up."
        ),
        "actions": [
            {
                "type": "flag_for_staff",
                "payload": {
                    "note": "VIP alert: Mr. Meyer on property",
                    "priority": "high",
                    "source_quote": "arriving this afternoon",
                },
            },
            {
                "type": "room_request",
                "payload": {
                    "request": "Mountain-View Suite pre-keyed · private in-villa check-in",
                    "source_quote": "arriving this afternoon",
                },
            },
        ],
    },
    {
        # Cycling / morning ride turn.
        "user_hint": "morning ride",
        "triggers": ["ride", "cycle", "cycling", "bike", "biking", "loop", "tarmac"],
        "say": (
            "Clear ridge tomorrow. Marco will pace your 5:30 AM loop, the bike "
            "is being tuned tonight, and your espresso will be at the stage at 5:15. "
            "Pre-load the high-sodium packs too?"
        ),
        "actions": [
            {
                "type": "flag_for_staff",
                "payload": {
                    "note": "Pacing guide Marco · Kings Mountain loop",
                    "priority": "normal",
                    "source_quote": "long ride tomorrow",
                    "when": "5:30 AM",
                },
            },
            {
                "type": "preference_note",
                "payload": {
                    "note": "House mechanic tuning S-Works Tarmac tonight",
                    "source_quote": "long ride tomorrow",
                },
            },
            {
                "type": "dining_request",
                "payload": {
                    "request": "Bici Coffee · staging espresso",
                    "when": "5:15 AM",
                    "source_quote": "long ride tomorrow",
                },
            },
            {
                "type": "preference_note",
                "payload": {
                    "note": "High-sodium electrolyte packs pre-positioned",
                    "source_quote": "long ride tomorrow",
                },
            },
        ],
    },
    {
        # Dinner / Madera flex turn.
        "user_hint": "dinner late",
        "triggers": ["madera", "dinner", "dine", "dining", "reservation", "alcove", "chef's counter"],
        "say": (
            "No pressure on timing — Chef Laurent is holding the Counter's quiet "
            "alcove for you anytime after 7:30. Enough breathing room?"
        ),
        "actions": [
            {
                "type": "dining_request",
                "payload": {
                    "request": "Madera · Chef's Counter alcove · open VIP hold",
                    "when": "after 7:30 PM",
                    "source_quote": "make dinner flexible",
                },
            },
            {
                "type": "preference_note",
                "payload": {
                    "note": "Chef Laurent briefed on late-night flexibility",
                    "source_quote": "make dinner flexible",
                },
            },
        ],
    },
    {
        # Charity / philanthropy turn.
        "user_hint": "charity / donor",
        "triggers": ["charity", "donor", "donation", "nonprofit", "philanthrop", "fundrais"],
        "say": (
            "Happy to help. Three on-property VC guests are already looped in, "
            "and the Executive Boardroom is held at 3 PM tomorrow for a donor "
            "briefing. Confirm the setup?"
        ),
        "actions": [
            {
                "type": "flag_for_staff",
                "payload": {
                    "note": "3 on-property VC/Tech donors invited to connect; Director of Community Affairs engaged",
                    "priority": "normal",
                    "source_quote": "charity briefing",
                },
            },
            {
                "type": "room_request",
                "payload": {
                    "request": "Executive Boardroom held for donor briefing",
                    "when": "3:00 PM tomorrow",
                    "source_quote": "charity briefing",
                },
            },
        ],
    },
    {
        # Recovery / spa turn.
        "user_hint": "spa / recovery",
        "triggers": ["spa", "massage", "recovery", "normatec", "compression", "therapy", "muscle"],
        "say": (
            "Had a feeling — spa is booked, so our Palo Alto partner will drop a "
            "Normatec setup to your suite by 10 AM. Charge it to the corporate account?"
        ),
        "actions": [
            {
                "type": "flag_for_staff",
                "payload": {
                    "note": "External vendor: Specialized Sports Therapy Labs (Palo Alto) · Normatec drop",
                    "priority": "normal",
                    "source_quote": "recovery before board meeting",
                    "when": "10:00 AM",
                },
            },
            {
                "type": "room_request",
                "payload": {
                    "request": "Normatec compression system · in-suite drop",
                    "when": "10:00 AM",
                    "source_quote": "recovery before board meeting",
                },
            },
        ],
    },
]


def get_demo_turn(
    script: str,
    speech: str,
    used_indices: set[int] | None = None,
) -> tuple[int, dict] | None:
    """Return (index, turn) for the first script row whose triggers appear in
    the guest's speech and that hasn't fired yet on this call. None if no row
    matches — caller should fall back to the live LLM path.

    used_indices is mutated by the caller after a successful fire so repeat
    keyword hits don't replay the same scripted line.
    """
    if script != "philip":
        return None
    speech_l = (speech or "").lower()
    if not speech_l:
        return None
    used = used_indices or set()
    for idx, turn in enumerate(PHILIP_TURNS):
        if idx in used:
            continue
        triggers = turn.get("triggers") or []
        if any(t.lower() in speech_l for t in triggers):
            return idx, turn
    return None
