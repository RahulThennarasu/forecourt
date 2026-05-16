# forecourt

> *The arrival orchestration agent for Rosewood Sand Hill.*

A voice-first AI concierge that takes incoming guest calls before arrival, has a natural conversation, synthesizes guest history with today's local context, and produces actionable briefings for hotel staff — all visible in real-time on an operations dashboard.

Built in 7 hours for the Rosewood Hospitality 2030 Hackathon.

---

## Table of Contents

- [What this is](#what-this-is)
- [The core mechanic: anticipatory offers](#the-core-mechanic-anticipatory-offers)
- [How it works](#how-it-works)
- [Live request stream (the dashboard)](#live-request-stream-the-dashboard)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [Setup instructions](#setup-instructions)
- [Running the system](#running-the-system)
- [Demo guide](#demo-guide)
- [Seed data](#seed-data)
- [Latency targets](#latency-targets)
- [Failure modes and recovery](#failure-modes-and-recovery)
- [Team and ownership](#team-and-ownership)
- [What we deliberately did NOT build](#what-we-deliberately-did-not-build)

---

## What this is

Rosewood's brand philosophy is **"A Sense of Place"** — every property is deeply tied to its local culture. But guests often experience a generic luxury arrival, regardless of where they're staying.

**forecourt solves this.**

When a returning guest calls the Rosewood arrival line, an AI concierge with a warm human voice greets them by name, gathers preferences in a natural ~90-second conversation, and surfaces *one anticipatory offer* — something the guest didn't ask for, drawn from synthesis across their past stays, today's local context, and what they just revealed.

While the call happens, the hotel's **operations dashboard** updates live: every guest utterance flows in as a transcript, every preference gets logged as a request, and every synthesis event lights up across the screen. The GM watches the agent think.

When the call ends, a **printed briefing card** is generated for staff. Specific. Tactile. Designed to be handed to the team that delivers the experience.

This is what arrival should feel like.

---

## The core mechanic: anticipatory offers

The single most important behavior in the system. Without it, this is a phone chatbot. With it, it's a butler.

An anticipatory offer is something the agent proposes that the guest **did not ask for**, based on synthesis across what they revealed, what the system already knew, and what's happening at the property today.

Every anticipatory offer contains three elements:

1. **A recall** — a specific detail from the guest's past stays
2. **A bridge** — connects that recall to today's local context
3. **A soft proposal** — framed as a question, never a hard pitch

### Example

> **Guest:** "It's our anniversary actually."
>
> **Agent:** "Congratulations. You stayed with us for your engagement two years ago — the corner suite with the oak tree view. I'll request it again if it's available. And Chef Marie does something quiet for anniversaries — would you like that kept off the bill as a surprise?"

The agent fused:
- An emotional anchor the guest just dropped (*anniversary*)
- A specific past stay detail (*engagement weekend, corner suite*)
- Today's local context (*Chef Marie is on duty + known for anniversary surprises*)

…into a proposal the guest never asked for but immediately wants.

### Restraint rules

- **Maximum one anticipatory offer per call.** After firing one, hold back any others.
- **If the guest mentions nothing personal, fire no offer.** Stay neutral.
- **Never stack multiple recalls in a single response.**
- **Never reference data the guest didn't reveal first** (e.g., no "I saw on your LinkedIn...").

Restraint is what makes the system feel luxury instead of surveillance.

---

## How it works

The end-to-end pipeline for a single call:

### 1. Guest calls the Rosewood number
Twilio receives the inbound call and POSTs to the server's `/voice` endpoint with the caller's phone number.

### 2. Caller identification
The server looks up the phone number in an **in-memory dictionary** of guest profiles (loaded once at server startup from SQLite). No database read happens during the call.

### 3. The opening hook
The server immediately plays a **pre-generated MP3** that greets the caller by name:

> *"Mr. Tanaka — welcome back. I see your flight from Tokyo lands at 4:32. Do you have a minute to plan a few things for your arrival?"*

The opening hook is generated once at server startup and cached, so playback is instant.

### 4. Conversation loop
Twilio's `<Gather input="speech">` captures each guest utterance and POSTs the transcript to `/respond`. The server:

- Adds the new utterance to the per-call conversation history (in memory, keyed by Twilio's `CallSid`)
- Sends the history + injected guest profile + injected local context to Claude
- Claude returns both a **spoken response** AND a **structured action JSON**
- The spoken response is synthesized via ElevenLabs (Turbo v2.5, "Charlotte" voice) and played to the guest
- The action JSON is logged to SQLite (fire-and-forget) AND pushed to the dashboard via WebSocket

### 5. The anticipatory offer fires
At some point in the conversation — typically turns 2 through 4 — Claude surfaces an anticipatory offer based on what the guest revealed. The system prompt enforces strict trigger rules and the one-per-call cap.

### 6. The closing
The agent ends the call with a callback to something the guest said. Never generic. *"Safe travels, and we'll have the Sancerre ready"* — not *"Have a great day."*

### 7. The briefing card
At call end, a one-page HTML briefing card is generated and rendered to PDF. It's designed to look like a luxury hotel artifact, printable on cream cardstock. The card contains the guest's arrival ETA, the notable past detail, the anticipatory offer that was made, active preferences, and one private note for the staff.

---

## Live request stream (the dashboard)

This is the operations layer — what the GM and front desk see in real time as guest calls happen.

### What it shows

The dashboard is a single screen split into four live-updating panels:

**Left panel — Live Transcript**
The guest's spoken words and the agent's spoken responses, appearing as they happen. Each turn timestamped. Speaker labels (Guest / Agent). The current speaker's row is highlighted in soft gold.

**Center panel — Synthesis Feed**
The system "thinking" visualized. As Claude references the guest's flight, past stays, or today's local context to formulate a response, those data sources light up on screen with a soft pulse. A thin gold line traces from the triggering transcript phrase to the data source that fired. This is what makes "synthesis" visible instead of invisible.

**Right panel — Live Request Stream**
Every request, preference, and action the agent captures during the call is logged here as it happens. Each row contains:
- Timestamp
- Action type (e.g., `preference_logged`, `reservation_requested`, `anticipatory_offer_fired`, `room_preference_noted`)
- A one-line human-readable detail (e.g., *"Vegetarian — wife"* or *"Madera, 19:00, quiet table"*)
- The source utterance that triggered it (collapsible)
- A status indicator (queued / acknowledged / fulfilled)

This panel is the **operations record** of the call. Front desk staff watching this can intervene at any point — for example, if the agent proposes a corner suite and front desk knows it's unavailable, they can mark the request and reach out separately.

The bottom of the right panel surfaces the **anticipatory offer event** with a special gold highlight when it fires, alongside the synthesis trace that produced it.

**Bottom strip — Today's Local Context**
A persistent banner showing the property's current state: weather, sunset, sommelier's pick, on-duty chef, today's events. This is the data the agent has access to. Visible at all times so staff understand what context is shaping recommendations.

After the call ends, the dashboard pivots to show the generated briefing card preview, with a Print button.

### How it updates

The dashboard subscribes to the server via **WebSocket**. The server pushes three types of events:

- `transcript_chunk` — a new line of dialogue (speaker, text, timestamp)
- `synthesis_event` — a data source was referenced (which source, which triggering phrase)
- `action_logged` — a new request or preference was captured (full action object)

The dashboard never queries the database directly. All data flows through WebSocket pushes. This keeps the dashboard real-time and decouples it from database load.

### Why the dashboard matters for the demo

It's the visible product. Judges hear the call but they *see* the dashboard. Three demo beats happen on screen:

1. The transcript flows live, proving real conversation
2. The synthesis feed lights up, proving the AI is fusing sources
3. The request stream populates, proving the call produces actionable output

If the audio fails mid-demo, the dashboard alone can carry the story.

---

## Architecture

```
                    ┌──────────────────┐
                    │   Guest's Phone  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │     Twilio       │
                    │  (voice + STT)   │
                    └────────┬─────────┘
                             │
                             │ webhooks via ngrok
                             ▼
              ┌────────────────────────────┐
              │      FastAPI Server        │
              │  ────────────────────────  │
              │  • In-memory guest cache   │
              │  • In-memory local context │
              │  • Conversation history    │
              │  • Claude orchestration    │
              │  • ElevenLabs synthesis    │
              └────┬────────────┬──────────┘
                   │            │
        fire-and-  │            │  WebSocket push
        forget     │            │  (transcripts,
        writes     │            │   synthesis events,
                   │            │   actions)
                   ▼            ▼
              ┌─────────┐  ┌──────────────────────┐
              │ SQLite  │  │  Operations          │
              │ (audit  │  │  Dashboard           │
              │  log)   │  │  (live for GM &      │
              └─────────┘  │   front desk staff)  │
                           └──────────────────────┘
```

Three principles guide this architecture:

1. **Memory over disk.** During a call, never read from the database. All hot-path data is in memory.
2. **Push, don't pull.** The dashboard subscribes to events. It does not poll.
3. **Fire-and-forget for writes.** Database logging happens in background tasks. It never blocks the conversation.

---

## Tech stack

| Layer | Technology |
|---|---|
| Telephony | Twilio Voice + `<Gather input="speech">` for STT |
| Voice synthesis | ElevenLabs API (Turbo v2.5, "Charlotte" preset) |
| Conversation AI | Anthropic Claude (Haiku 4.5 for most turns, Opus 4.7 for offer generation) |
| Backend | Python 3.11+ with FastAPI (async) |
| WebSockets | FastAPI built-in WebSocket support |
| Storage | SQLite (read once at startup; writes fire-and-forget) |
| Tunneling | ngrok |
| Frontend | Vanilla HTML + Tailwind via CDN + vanilla JS WebSocket client |
| Document generation | HTML → PDF (via headless Chrome or weasyprint) for briefing cards |

**Deliberately not in the stack:** Postgres, Redis, Docker, Celery, Next.js, React, build tools, ORMs, auth systems, or any service requiring deployment. This is a 7-hour build.

---

## Repository layout

```
/forecourt
├── README.md                    # This file
├── CLAUDE.md                    # Agent-facing project conventions
├── .env.example                 # Template for required API keys
├── .gitignore
├── requirements.txt
│
├── main.py                      # FastAPI app entry point, WebSocket router
├── voice.py                     # Twilio webhook handlers (/voice, /respond)
├── conversation.py              # Claude integration + turn logic
├── synthesis.py                 # ElevenLabs wrapper
├── data.py                      # In-memory guest profiles + local context
├── db.py                        # SQLite schema + write helpers
├── prompts.py                   # System prompt template + examples
├── ws.py                        # WebSocket connection manager
│
├── dashboard/
│   ├── index.html               # Operations dashboard (live)
│   ├── briefing.html            # Briefing card template
│   └── assets/
│       ├── styles.css           # Tailwind config + custom overrides
│       └── dashboard.js         # WebSocket client + render logic
│
├── audio/                       # Cached MP3 files (opening hooks)
│   └── opening_tanaka.mp3
│
├── tests/
│   ├── conversation_paths.md    # Canonical test conversations
│   └── test_anticipatory.py     # Tests for offer firing
│
└── docs/
    ├── DEMO_SCRIPT.md           # Word-by-word 3-minute demo
    └── EMERGENCY_PROCEDURES.md  # What to do when something breaks on stage
```

---

## Setup instructions

### Prerequisites

- Python 3.11+
- A Twilio account (free trial works)
- An ElevenLabs API key
- An Anthropic API key
- ngrok installed and authenticated

### Step 1: Clone and enter the repo

```bash
git clone <repo-url> forecourt
cd forecourt
```

### Step 2: Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate    # On Windows: venv\Scripts\activate
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

`requirements.txt` contents:
```
fastapi
uvicorn[standard]
twilio
elevenlabs
anthropic
python-dotenv
websockets
weasyprint
```

### Step 4: Configure environment variables

Copy `.env.example` to `.env` and fill in:

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxx
NGROK_PUBLIC_URL=https://xxxx.ngrok-free.app
```

### Step 5: Initialize the database and seed Tanaka

```bash
python -c "from db import init_db, seed_demo_data; init_db(); seed_demo_data()"
```

This creates `forecourt.db` and inserts the Tanaka guest profile.

**Important:** the seed phone number in `data.py` must match the phone you'll demo from. Edit `data.py` and update `TANAKA_PROFILE["phone"]` before seeding.

### Step 6: Pre-generate the opening hook

```bash
python -m synthesis generate_openings
```

This synthesizes Tanaka's opening greeting via ElevenLabs and saves it to `audio/opening_tanaka.mp3`. Re-run this any time you change the voice or the opening line.

### Step 7: Twilio configuration

1. Go to the Twilio Console → Phone Numbers → Active Numbers → click your number
2. Under "A call comes in," set the dropdown to **Webhook**
3. Set the URL to `https://your-ngrok-url.ngrok-free.app/voice`
4. Method: HTTP POST
5. Save

### Step 8: Verify your demo phone (Twilio trial only)

If you're on a Twilio trial account, you must verify any phone numbers you want to call from. Go to Phone Numbers → Verified Caller IDs → Add a new Caller ID. Verify your phone and your teammates' phones.

---

## Running the system

You need two terminals (three is better).

### Terminal 1: Start ngrok

```bash
ngrok http 8000
```

Copy the HTTPS URL it gives you. Update Twilio's webhook to point to `<that-url>/voice` if it changed since your last run.

### Terminal 2: Start the FastAPI server

```bash
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

You should see logs like:
```
INFO: Loaded 1 guest profiles into memory
INFO: Local context loaded
INFO: Pre-generated 1 opening hook MP3s
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Terminal 3 (optional but recommended): Open the dashboard

```bash
open dashboard/index.html
```

Or just navigate to `file:///path/to/forecourt/dashboard/index.html` in a browser.

The dashboard will connect to the WebSocket at `ws://localhost:8000/ws` automatically.

### Make a test call

Dial the Twilio number from your demo phone. You should:

1. Hear the personalized opening greeting within 1 second
2. See the transcript appear in the dashboard's left panel as you speak
3. See synthesis events light up in the center as the agent references data
4. See actions populate the right panel as the agent logs requests

If any of those fail, see the [Failure modes](#failure-modes-and-recovery) section.

---

## Demo guide

The demo is 3 minutes. Every second is choreographed. Full word-by-word script lives in `docs/DEMO_SCRIPT.md`.

### Two-person operation

- **Speaker** (faces judges, holds the demo phone, talks)
- **Operator** (sits at laptop, advances cues, monitors dashboard, has backup files ready)

Never use timers. The operator advances every scene on the speaker's verbal mark.

### High-level demo arc

| Time | What |
|---|---|
| 0:00–0:15 | Cold open — frame the problem in one sentence |
| 0:15–0:50 | Hand the phone to a judge. The agent's opening hook plays. |
| 0:50–2:10 | Live conversation. Anticipatory offer fires. Dashboard updates live. |
| 2:10–2:40 | Walk to the dashboard. Point at the synthesis trace and the request stream. |
| 2:40–3:00 | Hand a judge the printed briefing card. Close with one sentence. |

### Pre-demo checklist

- [ ] Laptop charged to 100%
- [ ] Sleep disabled on the demo laptop
- [ ] ngrok started and stable, Twilio webhook updated to current URL
- [ ] FastAPI server running, logs clean
- [ ] Dashboard open in fullscreen on the projection display
- [ ] Demo phone charged, on speaker mode, ringer audible
- [ ] Test call completed successfully from the actual demo location
- [ ] Backup MP3 of the canonical anticipatory offer response loaded
- [ ] Backup video of an ideal full call ready to play if everything dies
- [ ] 8 printed briefing cards on cream cardstock, ready to hand out
- [ ] Demo script taped to the laptop in 18-point font

### The persona card

Before handing the phone to a judge, hand them a small card that reads:

> *You are Mr. Tanaka. You're flying in tomorrow with your wife. It's your second anniversary. You stayed at Rosewood Sand Hill once before. Just be yourself — the agent will guide the conversation.*

This is your single highest-reliability move. Without it, judges freeze.

---

## Seed data

The entire demo runs on one guest persona: **Mr. Tanaka**.

### Guest profile

```python
TANAKA_PROFILE = {
    "phone": "+1XXXXXXXXXX",  # MUST match demo phone
    "name": "Mr. Tanaka",
    "past_stays": [
        {
            "date": "Sept 2023",
            "context": "engagement weekend",
            "room": "Corner suite, oak tree view"
        },
        {
            "date": "Mar 2024",
            "context": "business trip",
            "room": "Standard king"
        }
    ],
    "preferences": {
        "dining": "vegetarian (wife), prefers Sancerre, quiet seating",
        "room": "cool temperature (~68°F), extra duvet",
        "schedule": "early breakfast on business trips"
    },
    "flight_today": {
        "number": "UA241",
        "from": "HND",
        "eta": "16:32 PT"
    },
    "notable": "Anniversary is this weekend"
}
```

### Today's local context at Rosewood Sand Hill

```python
LOCAL_CONTEXT = {
    "weather": "68°F, clear, sunset 19:42",
    "sommelier_pick": "Sancerre, Loire Valley 2021",
    "on_duty": "Chef Marie (known for quiet anniversary surprises)",
    "events": "Live jazz on the patio 18:00-20:00",
    "facilities": [
        "Madera restaurant",
        "Sense spa",
        "Patio",
        "Pool",
        "Tennis courts"
    ]
}
```

This data is loaded once into memory at server startup and injected into Claude's system prompt for every call. It is designed to enable the canonical anticipatory offer: anniversary trigger → engagement weekend recall → Chef Marie bridge → off-the-bill proposal.

**Do not change this data without coordinating with the team.** The demo conversation paths depend on this exact alignment.

---

## Latency targets

This is a voice agent. Latency is the most important quality metric.

| Stage | Target | Optimization |
|---|---|---|
| Speech-to-text | <500ms | Twilio Gather with `speechTimeout="auto"` |
| In-memory guest lookup | <5ms | Python dict, not SQLite query |
| Claude generation (Haiku) | <800ms | Compressed prompt, prompt caching |
| ElevenLabs synthesis | <600ms | Turbo v2.5 model, not flagship |
| Twilio audio playback start | <200ms | Pre-generated for opening, streaming for responses |
| **Total per turn** | **<2000ms** | |

Rules to preserve latency:

- Guest profiles and local context live in memory, loaded at server startup
- Database writes are fire-and-forget via FastAPI's `BackgroundTasks`
- Use Claude Haiku 4.5 for routine turns; reserve Opus 4.7 only for the anticipatory offer turn
- Use ElevenLabs Turbo v2.5 (`eleven_turbo_v2_5`), never the flagship
- Cache the opening hook MP3
- Use Anthropic prompt caching for static portions of the system prompt
- Keep the system prompt under 1500 tokens

---

## Failure modes and recovery

### ElevenLabs is slow or returns an error
The system has a **fake-live toggle** in `synthesis.py`. When enabled, it falls back to pre-rendered MP3s for the canonical anticipatory offer response. This is intentional demo insurance, not a bug. Keep the toggle on during the demo by default.

### Claude returns unparseable JSON for actions
The spoken response is still played normally. The action logging step is skipped for that turn. The conversation continues; the dashboard misses one event. Failure is silent and graceful.

### Twilio can't reach the server (ngrok dropped)
The call drops on the guest's end. There is no mid-demo recovery. Mitigation:
- Disable laptop sleep before the demo
- Keep ngrok in a dedicated terminal you don't touch
- Test the round-trip from the demo room before the demo starts
- Have a backup video of an ideal call ready to play

### Guest says something Claude doesn't know how to handle
The system prompt includes a graceful redirect: *"Let me have the team look into that. What else can I help with for your arrival?"* This is the universal escape hatch.

### Dashboard WebSocket disconnects
The dashboard automatically attempts reconnection every 2 seconds. If reconnection fails, refresh the page. Past events will not replay (this is acceptable for a demo).

### Phone signal is weak in the demo room
Test in advance. Have a backup phone on a different carrier ready.

### Audio is too quiet in the demo room
Bring a small Bluetooth speaker. Pair it before the demo. Switch the phone to play through it if needed.

---

## Team and ownership

| Person | Owns |
|---|---|
| **Sid** | Voice pipeline (Twilio, ElevenLabs, Claude prompting, conversation logic, latency optimization) |
| **Rahul** | Operations dashboard, synthesis visualization, briefing card UI, WebSocket client |
| **Both** | Seed data, briefing card design, demo rehearsal, on-stage operation |

### On-stage roles during demo

- **Speaker:** faces judges, holds the demo phone, delivers narration
- **Operator:** sits at the laptop, manually advances scenes, monitors dashboard, has backup files cued

Decide who plays which role in hour 6, not hour 7.

---

## What we deliberately did NOT build

These are choices, not gaps. Each one trades scope for demo reliability.

- **No web frontend for guests** — the guest interface is the phone call
- **No login or authentication** — single demo guest, single demo phone
- **No mobile app** — same reason
- **No real flight tracker API** — flight data is hardcoded in `LOCAL_CONTEXT`
- **No real weather API** — weather is hardcoded
- **No multi-tenancy or multi-guest support** — there is one guest in the database
- **No second guest persona** — adding one would require new audio cache, new system prompt tuning, new test paths; out of scope
- **No real-time spoken language detection** — English only
- **No production deployment** — runs locally, exposed via ngrok
- **No automated test suite beyond conversation paths** — canonical conversation testing is the bar
- **No "returning guest detection" beyond hardcoded number matching** — single number lookup is enough
- **No SMS confirmations** — could be added in <30 minutes if time allows, but is not core
- **No staff-side mobile app** — the dashboard is the staff interface

If you're tempted to add any of these, ask: does it make the 3-minute demo better? If not, don't.

---

## Acknowledgments

Built for the **Rosewood Hospitality 2030 Hackathon**. Inspired by Rosewood's "A Sense of Place" philosophy.

Voice powered by ElevenLabs. Conversation powered by Anthropic Claude. Telephony powered by Twilio.

---

## License

Internal hackathon project. Not for redistribution.
