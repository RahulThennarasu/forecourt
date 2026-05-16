"""Profile-leak guard for the Threshold voice pipeline.

The agent receives the guest profile as part of its system prompt, including
facts the guest may not have revealed on this call (origin city, flight number,
past room details, dietary needs). The prompt's <restraint_rules> instruct
Claude not to volunteer these, but the model is probabilistic — slips happen.

This module is the deterministic backstop. Each rule is one of two tiers:

  - core: leaks that would feel surveillance-y or break trust if spoken aloud
    (origin city, flight number, specific ETA, past room details, anniversary
    when unprompted, spouse references). On a core leak, voice.py replaces the
    ENTIRE spoken reply with a safe deflection.

  - side: secondary flavor that the agent could have left out without losing
    the offer (dietary, wine preference). On a side leak, the offending word
    is redacted in-place and the rest of the reply — including the
    anticipatory offer — survives. This is what we want for the canonical
    anniversary path: a wandering "vegetarian dinner" mention should not
    take Chef Marie's anniversary surprise down with it.

Rules are written specifically for Tanaka's profile (the demo's single guest).
Each rule:
  tier:        "core" or "side" (see above).
  guarded:     substrings that, if found in the agent's text, MIGHT be a leak.
  unlocked_by: substrings in the guest's transcript that authorise the agent
               to surface that fact. If none match, the guard fires.
  redactions:  (side tier only) list of (pattern, replacement) regex pairs
               applied to the agent's text when the rule fires.

Substring match is intentional — it catches simple inflections and short
phrases without an NLP pipeline. False negatives (creative paraphrases that
slip past) are possible; the prompt rules are the first line of defence and
catch most of those.
"""

from __future__ import annotations

import re
from typing import Optional

# Each guard fires when one of `guarded` appears in the agent's say_text and
# none of `unlocked_by` appears in the guest's combined utterances.
GUARDS: list[dict] = [
    {
        # Origin city / airport. The example failure mode the user asked about:
        # "safe travels from Tokyo" when the guest never said where they were
        # flying from.
        "label": "origin_city",
        "tier": "core",
        "guarded": ["tokyo", "haneda", "hnd", "japan", "japanese", "from asia"],
        "unlocked_by": ["tokyo", "haneda", "hnd", "japan", "japanese", "asia"],
    },
    {
        "label": "flight_number",
        "tier": "core",
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
        "tier": "core",
        "guarded": ["oak tree", "oak view", "corner suite", "the same suite"],
        "unlocked_by": [
            "anniversary", "engagement", "last time", "before",
            "stayed", "same suite", "same room", "previous",
            "again", "celebrat",
        ],
    },
    {
        # Wine — redactable. "We have a Sancerre tonight" becomes "We have a
        # wine tonight" rather than nuking the whole offer.
        "label": "wine_pref",
        "tier": "side",
        "guarded": ["sancerre", "loire"],
        "unlocked_by": [
            "wine", "sancerre", "drink", "loire", "white",
            "with the meal",
        ],
        "redactions": [
            (r"\bsancerre\b", "wine"),
            (r"\bloire\s+valley\b", "wine list"),
            (r"\bloire\b", "wine list"),
        ],
    },
    {
        # Spouse / partner — never volunteer.
        "label": "spouse",
        "tier": "core",
        "guarded": ["your wife", "her vegetarian", "wife's", "your partner"],
        "unlocked_by": [
            "wife", "partner", "spouse", "girlfriend",
            "fiancé", "fiance", "husband", "we ", "our ", "us ",
        ],
    },
    {
        # Dietary — redactable. "Vegetarian dinner" becomes "dinner" so the
        # rest of the response (e.g., Chef Marie anniversary surprise)
        # survives intact.
        "label": "dietary",
        "tier": "side",
        "guarded": ["vegetarian", "vegan", "plant based", "plant-based"],
        "unlocked_by": [
            "vegetarian", "vegan", "diet", "allerg",
            "no meat", "plant", "kosher", "halal",
        ],
        "redactions": [
            (r"\bvegetarian-friendly\b", ""),
            (r"\bvegan-friendly\b", ""),
            (r"\bplant[-\s]+based\s+", ""),
            (r"\bvegetarian\s+", ""),
            (r"\bvegan\s+", ""),
            (r"\bvegetarian\b", ""),
            (r"\bvegan\b", ""),
        ],
    },
    {
        "label": "anniversary",
        "tier": "core",
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
        "tier": "core",
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


def _tidy(text: str) -> str:
    """Clean up artifacts left by word redaction.

    Run repairs in order, since each pass can expose new dangling fragments:
      1. Collapse runs of whitespace.
      2. Drop dangling linking verbs that lost their predicate. Without this,
         redacting "vegetarian" from "your wife is vegetarian — should we"
         leaves the surreal "your wife is — should we". After the repair it
         reads "your wife — should we".
      3. Drop stranded articles/possessives sitting against punctuation.
      4. Remove spaces immediately before punctuation.
      5. Collapse the doubled em-dashes / double spaces the repairs can
         produce ("— —" / "  ").
    """
    text = re.sub(r"\s{2,}", " ", text)
    # Strip dangling linking/auxiliary verbs before punctuation or a dash.
    # \s* on the right so "is." with no space matches too. Replace with a
    # single space so "wife is —" becomes "wife —" rather than "wife—".
    text = re.sub(
        r"\s+\b(?:is|are|was|were|has|have|had|will|would|should|do|does|did|can|could|may|might)\b\s*(?=[—–\-,.!?;:])",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    # Strip dangling articles/possessives left over after a redaction (e.g.
    # "arrange a ." becomes "arrange.").
    text = re.sub(
        r"\b(?:a|an|the|some|any|her|his|your|our|their)\s+(?=[.,!?;:—–\-])",
        "",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+([.,!?;:])", r"\1", text)
    # Two redactions in a row can produce "X — —" or doubled spaces. Tighten.
    text = re.sub(r"([—–\-])\s*\1", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def check_leaks(
    say_text: str,
    guest_profile: Optional[dict],
    history: list[dict],
) -> list[str]:
    """Backwards-compatible label-only check. Returns labels of any rules
    that fired (across both tiers). Empty list = clean. Prefer redact_leaks
    in new code — it carries the cleaned text for side-tier leaks."""
    _, labels = redact_leaks(say_text, guest_profile, history)
    return labels


def redact_leaks(
    say_text: str,
    guest_profile: Optional[dict],
    history: list[dict],
) -> tuple[Optional[str], list[str]]:
    """Inspect the agent's about-to-be-spoken text for profile leaks.

    Returns (clean_text, fired_labels):
      - If no leak fires: (say_text, []).
      - If only side-tier leaks fire: (redacted_text, [...labels]). The caller
        should play the redacted text and may keep its actions — the offer
        survives the redaction.
      - If any core-tier leak fires: (None, [...labels]). The caller should
        fall back to a safe deflection and drop all actions for this turn.

    Substring match is case-insensitive. A rule fires when its guarded term is
    in say_text AND none of its unlocks are in the guest's utterances so far.
    """
    if not _has_profile_content(guest_profile):
        return say_text, []

    guest_text = " ".join(
        (m.get("content") or "").lower()
        for m in history
        if m.get("role") == "user"
    )
    say_lower = say_text.lower()

    fired: list[str] = []
    has_core = False
    side_rules: list[dict] = []
    for rule in GUARDS:
        if any(term in say_lower for term in rule["guarded"]):
            if not any(unlock in guest_text for unlock in rule["unlocked_by"]):
                fired.append(rule["label"])
                if rule.get("tier", "core") == "core":
                    has_core = True
                else:
                    side_rules.append(rule)

    if not fired:
        return say_text, []

    if has_core:
        # A core leak means the agent is referencing something surveillance-y.
        # No safe way to redact in place — caller must fully deflect.
        return None, fired

    # Side-only: apply each fired rule's redactions in turn.
    redacted = say_text
    for rule in side_rules:
        for pattern, replacement in rule.get("redactions", []):
            redacted = re.sub(pattern, replacement, redacted, flags=re.IGNORECASE)
    redacted = _tidy(redacted)

    # If redaction stripped almost everything (e.g. the whole offer was built
    # around the leaked term), fall back to deflection rather than playing a
    # near-empty line.
    if len(redacted.split()) < 3:
        return None, fired

    return redacted, fired
