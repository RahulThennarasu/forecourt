"""Profile-leak guard for the Threshold voice pipeline.

The agent receives the guest profile as part of its system prompt, including
facts the guest may not have revealed on this call (origin city, flight number,
past room details, dietary needs). The prompt's <restraint_rules> instruct
Claude not to volunteer these, but the model is probabilistic — slips happen.

This module is the deterministic backstop: it scans the agent's about-to-be-
spoken text for facts that aren't backed by the guest's own utterances and
reports them. voice.py replaces leaky text with a safe deflection before
synthesis, so the guarded fact literally never reaches the audio.

Rules are written specifically for Tanaka's profile (the demo's single guest).
Each rule:
  guarded:     substrings that, if found in the agent's text, MIGHT be a leak.
  unlocked_by: substrings in the guest's transcript that authorise the agent
               to surface that fact. If none match, the guard fires.

Substring match is intentional — it catches simple inflections and short
phrases without an NLP pipeline. False negatives (creative paraphrases that
slip past) are possible; the prompt rules are the first line of defence and
catch most of those. False positives are minimised by including a broad set
of unlock terms (e.g., "celebrating" unlocks "anniversary").
"""

from __future__ import annotations

from typing import Optional

# Each guard fires when one of `guarded` appears in the agent's say_text and
# none of `unlocked_by` appears in the guest's combined utterances.
GUARDS: list[dict] = [
    {
        # Origin city / airport. The example failure mode the user asked about:
        # "safe travels from Tokyo" when the guest never said where they were
        # flying from.
        "label": "origin_city",
        "guarded": ["tokyo", "haneda", "hnd", "japan", "japanese", "from asia"],
        "unlocked_by": ["tokyo", "haneda", "hnd", "japan", "japanese", "asia"],
    },
    {
        "label": "flight_number",
        "guarded": ["ua241", "ua 241", "united 241"],
        "unlocked_by": [
            "ua241", "ua 241", "united 241",
            "flight number", "what flight", "my flight",
        ],
    },
    {
        # Past stay specifics — only mention if the guest signalled return,
        # anniversary, or asked about a prior visit.
        "label": "past_room",
        "guarded": ["oak tree", "oak view", "corner suite", "the same suite"],
        "unlocked_by": [
            "anniversary", "engagement", "last time", "before",
            "stayed", "same suite", "same room", "previous",
            "again", "celebrat",
        ],
    },
    {
        "label": "wine_pref",
        "guarded": ["sancerre", "loire"],
        "unlocked_by": [
            "wine", "sancerre", "drink", "loire", "white",
            "dinner", "dining", "with the meal",
        ],
    },
    {
        # Spouse / partner — never volunteer.
        "label": "spouse",
        "guarded": ["your wife", "her vegetarian", "wife's", "your partner"],
        "unlocked_by": [
            "wife", "partner", "spouse", "girlfriend",
            "fiancé", "fiance", "husband", "we ", "our ", "us ",
        ],
    },
    {
        "label": "dietary",
        "guarded": ["vegetarian", "vegan", "plant based", "plant-based"],
        "unlocked_by": [
            "vegetarian", "vegan", "diet", "allerg",
            "no meat", "plant", "kosher", "halal",
        ],
    },
    {
        "label": "anniversary",
        "guarded": [
            "anniversary", "engagement", "two years ago",
            "your celebration",
        ],
        "unlocked_by": [
            "anniversary", "celebrat", "engagement",
            "special occasion", "milestone", "our years",
        ],
    },
    {
        # Specific arrival time from the profile (ETA 16:32 PT). Mentioning it
        # unprompted reads as "we're tracking your flight" — surveillance vibe.
        "label": "specific_eta",
        "guarded": [
            "four thirty-two", "four thirty two", "4:32",
            "16:32", "sixteen thirty-two",
        ],
        "unlocked_by": [
            "four thirty", "4:30", "16:30",
            "in around", "arriving at", "land at", "get in at",
            "should be in", "ETA",
        ],
    },
]


def _has_profile_content(guest_profile: Optional[dict]) -> bool:
    """Cheap check: does this profile carry any leakable facts at all?
    Walk-ins use WALK_IN_PROFILE with empty fields — no leak surface, skip.
    """
    if guest_profile is None:
        return False
    if guest_profile.get("past_stays"):
        return True
    if guest_profile.get("flight_today"):
        return True
    prefs = guest_profile.get("preferences") or {}
    return any(prefs.values())


def check_leaks(
    say_text: str,
    guest_profile: Optional[dict],
    history: list[dict],
) -> list[str]:
    """Return labels of any guard rules that fired. Empty list = clean.

    A rule fires when:
      - the agent's say_text contains a guarded substring (case-insensitive)
      - AND none of the rule's unlock terms appear in the guest's utterances
        across the conversation so far.
    """
    if not _has_profile_content(guest_profile):
        return []

    guest_text = " ".join(
        (m.get("content") or "").lower()
        for m in history
        if m.get("role") == "user"
    )
    say_lower = say_text.lower()

    fired: list[str] = []
    for rule in GUARDS:
        if any(term in say_lower for term in rule["guarded"]):
            if not any(unlock in guest_text for unlock in rule["unlocked_by"]):
                fired.append(rule["label"])
    return fired
