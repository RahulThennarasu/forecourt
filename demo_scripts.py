"""Deterministic demo scripts for voice calls.

Used to make hackathon demos repeatable: given a guest profile with a
`demo_script` value, voice.py can bypass the LLM and return a scripted
assistant reply + actions per turn.
"""

from __future__ import annotations


PHILIP_TURNS: list[dict] = [
    {
        "user_hint": "arriving this afternoon",
        "say": (
            "Welcome back, Mr. Meyer. We have your preferred Santa Cruz Mountain-View "
            "Suite pre-keyed and ready. Given your tight schedule before Palo Alto, "
            "I have bypassed the front desk entirely and arranged for your private "
            "check-in directly in-villa."
        ),
        "actions": [
            {"type": "room", "payload": {"text": "VIP Internal Alert Triggered: Philip Meyer on property"}},
            {"type": "room", "payload": {"text": "Santa Cruz Mountain-View Suite prepared with private in-villa check-in"}},
        ],
    },
    {
        "user_hint": "long ride",
        "say": (
            "I see the ridge has clear visibility tomorrow morning. I’ve gone ahead and "
            "reserved Marco to pace you on the 60-mile Kings Mountain to Skyline loop "
            "starting at 5:30 AM. Our house mechanic is tuning your S-Works Tarmac tonight, "
            "and Bici Coffee will have your double-espresso ready at the staging area at 5:15 AM. "
            "Shall we have your custom high-sodium electrolyte packs pre-loaded into your bottles?"
        ),
        "actions": [
            {"type": "facility", "payload": {"text": "Pacing Guide Marco reserved for Kings Mountain Loop · 5:30 AM"}},
            {"type": "facility", "payload": {"text": "On-site bike mechanics activated for full frame & drivetrain tune-up"}},
            {"type": "amenity", "payload": {"text": "Bici Coffee scheduled for custom 5:15 AM espresso staging"}},
            {"type": "amenity", "payload": {"text": "Custom high-sodium electrolyte hydration packs pre-positioned"}},
        ],
    },
    {
        "user_hint": "madera after 7",
        "say": (
            "We will easily absorb that delay, sir. I have transitioned your Madera dining window "
            "to an open, fluid hold. Chef Laurent has reserved the quiet alcove at the Chef’s Counter "
            "for you anytime after 7:30 PM. There is zero cancellation pressure; we will keep the kitchen "
            "active for you even if the call runs late into the evening. Does that offer you enough breathing room?"
        ),
        "actions": [
            {"type": "dining", "payload": {"text": "Madera Dining Reservation converted to infinite VIP open hold"}},
            {"type": "dining", "payload": {"text": "Secluded Madera Chef’s Counter alcove blocked for low-stimulus dining"}},
            {"type": "dining", "payload": {"text": "Chef Laurent briefed on late-night culinary flexibility and custom pairings"}},
        ],
    },
    {
        "user_hint": "charity",
        "say": (
            "We would love to champion this. I’ve already contacted our Director of Community Affairs. "
            "We have flagged three prominent Venture Capital managing partners—all cycling enthusiasts currently staying with us—and "
            "invited them to connect. I’ve blocked out the Executive Boardroom for 3:00 PM tomorrow if you'd like to host an intimate "
            "donor briefing, and we can arrange a charity reception on the Vista Lawn for your next visit. Shall I confirm the boardroom setup?"
        ),
        "actions": [
            {"type": "facility", "payload": {"text": "Director of Community Affairs engaged as core nonprofit liaison"}},
            {"type": "amenity", "payload": {"text": "Outreach initiated to 3 on-property VC/Tech donors for charity mentorship briefing"}},
            {"type": "facility", "payload": {"text": "Executive Boardroom reserved for 3:00 PM pitch & donor presentation"}},
        ],
    },
    {
        "user_hint": "spa fills up",
        "say": (
            "I anticipated that, Mr. Meyer. Our internal spa treatment rooms are fully committed tomorrow morning, "
            "so I have reached out to our elite outside sports-medicine partner in Palo Alto. I have contracted them to deliver "
            "a professional Normatec dynamic air-compression setup directly to your suite by 10:00 AM. They will configure it in "
            "your private living space so you can run an intense physical recovery cycle at your own convenience before your board meeting. "
            "Shall I finalize the external vendor invoice to your corporate account?"
        ),
        "actions": [
            {"type": "amenity", "payload": {"text": "External Contract Executed: Specialized Sports Therapy Labs (Palo Alto)"}},
            {"type": "room", "payload": {"text": "Suite Drop Scheduled: In-room setup of Normatec Compression System · 10:00 AM"}},
        ],
    },
]


def get_demo_turn(script: str, turn_index: int) -> dict | None:
    if script == "philip":
        if 0 <= turn_index < len(PHILIP_TURNS):
            return PHILIP_TURNS[turn_index]
        return None
    return None

