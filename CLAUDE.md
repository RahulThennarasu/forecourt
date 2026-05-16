# Threshold

The arrival orchestration agent for Rosewood Sand Hill. A voice-first system that takes incoming guest calls before arrival, has a natural conversation, synthesizes guest history with today's local context, and produces actionable briefings for hotel staff.

Built for a 7-hour hackathon. Demo-first. Do not over-engineer.

---

## What this project is

A returning guest calls a Rosewood phone number before their stay. An AI concierge with a warm human voice greets them by name, gathers arrival preferences in a natural 90-second conversation, and — critically — surfaces **one anticipatory offer** based on synthesis across the guest's past stays, their flight today, and today's on-property context.

While the call happens, a live dashboard shows the conversation transcript alongside the synthesis events firing in real time (flight data lighting up, past stay matching, local context bridging). At the end of the call, a printed briefing card is generated for the hotel staff.

The whole system is built around demonstrating one core mechanic: **the anticipatory offer**. Everything else is plumbing that supports it.

---

## The non-negotiable behavior: the anticipatory offer

Every call must surface exactly one anticipatory offer. This is the entire point of the product. Without it, this is a phone chatbot.

An anticipatory offer combines three elements:

1. **A recall** — a specific detail from the guest's past stays
2. **A bridge** — connects that recall to today's local context
3. **A soft proposal** — framed as a question, never a hard pitch

Trigger conditions (fire the offer when the guest mentions any of these):
- An emotional anchor: anniversary, birthday, milestone, first visit, return after a long gap, grief, celebration
- A logistical detail you can match to history: flight, arrival time, dining preference
- A constraint that matches today's local context: quiet, vegetarian, dietary need

Restraint rules:
- Surface ONE offer per call. Maximum.
- If the guest mentions nothing personal, fire no offer. Stay neutral.
- Never stack multiple recalls in a single response.
- Never surface details the guest didn't reference.
- Never reference data sources that would feel like surveillance (e.g., "I saw on your LinkedIn...").

Example:
> Guest: "It's our anniversary actually."
> Agent: "Congratulations. You stayed with us for your engagement two years ago — the corner suite with the oak tree view. I'll request it again. And Chef Marie does something quiet for anniversaries — would you like that kept off the bill as a surprise?"

If you are writing or modifying any code that affects how the agent decides what to say, you must preserve this behavior. Test changes against the four canonical conversation paths in `/tests/conversation_paths.md`.

---

## Architecture

Three components, deliberately decoupled:

```
[Twilio]  ──audio──>  [FastAPI Server]  ──actions──>  [SQLite]
                              │                            │
                              │                            │
                         ──synthesis──>  [Dashboard via WebSocket]
```

### The voice pipeline (Sid owns this)

1. Twilio receives the inbound call and POSTs to `/voice` with the caller's phone number
2. Server looks up the caller in the in-memory `GUESTS` dict (NOT from SQLite during a call)
3. Server plays the pre-generated opening hook MP3 immediately
4. Twilio's `<Gather input="speech">` captures guest speech and POSTs transcripts to `/respond`
5. `/respond` sends transcript + conversation history to Claude with the injected guest profile
6. Claude returns spoken response + structured action JSON
7. Spoken response → ElevenLabs (Turbo v2.5) → audio file → Twilio plays it
8. Action JSON → fire-and-forget SQLite write + WebSocket push to dashboard
9. Loop until guest hangs up or `<Hangup>` is triggered

### The dashboard (Rahul owns this)

Single HTML page with three panels:
- **Live transcript** (left)
- **Synthesis feed** (center) — flight, past stay, local context lighting up as they're referenced
- **Proposed actions** (right) — queue of actions logged from the call

Connects to the server via WebSocket. Does NOT read from SQLite directly during a call.

At call end, the briefing card view appears with a Print button.

### The briefing card

HTML template renders to PDF. Designed to look like a luxury hotel artifact — Cormorant Garamond, cream cardstock when printed, single accent color. Print 8 copies the night before the demo.

---

## Latency budget (target: under 2 seconds per turn)

This is a voice agent. Latency is the most important quality metric.

| Stage | Target |
|---|---|
| Speech-to-text (Twilio Gather) | <500ms |
| In-memory guest lookup | <5ms |
| Claude generation (Haiku) | <800ms |
| ElevenLabs synthesis (Turbo) | <600ms |
| **Total per turn** | **<2000ms** |

Rules to preserve this:
- **Never read from SQLite during a turn.** Guest profiles and local context live in memory, loaded at server startup.
- **Database writes are fire-and-forget.** Use FastAPI's `BackgroundTasks` so logging never blocks a response.
- **Use Claude Haiku 4.5 for non-critical turns.** Reserve Opus 4.7 only for turns where the anticipatory offer is being generated.
- **Use ElevenLabs Turbo v2.5 (`eleven_turbo_v2_5`)**, never the flagship model. Audio is being compressed to 8kHz by Twilio anyway.
- **Cache the opening hook MP3.** Pre-generate at server startup. Never synthesize the greeting live.
- **Use Anthropic prompt caching** for static portions of the system prompt.
- **Keep the system prompt under 1500 tokens.** Compress aggressively.

If a code change would add latency to the hot path, push back. Find another way.

---

## Tech stack

- **Python 3.11+** with FastAPI (async)
- **Twilio Voice** — phone routing + STT via `<Gather input="speech">`
- **ElevenLabs API** — voice synthesis (Turbo v2.5, "Charlotte" preset voice)
- **Anthropic Claude API** — conversation logic + structured action extraction
- **SQLite** — guest profiles (read once at startup) + action log (writes only during calls)
- **ngrok** — exposes local server to Twilio webhooks
- **uvicorn** — ASGI server
- **WebSockets** (via FastAPI built-in) — push actions to dashboard

Frontend (Rahul's domain): Vite + React + Tailwind v4, scaffolded from a Figma Make export. The dashboard lives at the repo root (not in a `dashboard/` subdir), runs on Vite's dev server, and will connect to FastAPI via a WebSocket client written in plain React.

Do NOT introduce: Postgres, Redis, Docker, Celery, Next.js, ORMs, authentication systems, or any service that requires deployment. This is a 7-hour build.

---

## Repository layout

```
/forecourt                       # repo root (project codename: Threshold)
├── CLAUDE.md                    # This file
├── README.md                    # Setup instructions for human teammates
├── .env                         # API keys (gitignored)
│
├── main.py                      # FastAPI app entry point
├── voice.py                     # Twilio webhook handlers           (planned)
├── conversation.py              # Claude integration + turn logic   (planned)
├── synthesis.py                 # ElevenLabs wrapper                (planned)
├── data.py                      # In-memory guest profiles + local  (planned)
├── db.py                        # SQLite schema + write helpers     (planned)
├── prompts.py                   # System prompt template + examples (planned)
├── audio/                       # Cached MP3 files                  (planned)
├── tests/                       # Canonical conversation paths      (planned)
├── requirements.txt             # Python deps (fastapi, uvicorn, …)
│
├── index.html                   # Vite entrypoint for the dashboard
├── vite.config.ts               # Vite config (figma asset resolver + tailwind)
├── package.json                 # Dashboard deps (React, Radix, Tailwind v4)
├── src/
│   ├── main.tsx                 # React root
│   ├── app/                     # App.tsx + dashboard components
│   ├── imports/                 # Figma export assets (screenshots, etc.)
│   └── styles/                  # tailwind.css, theme.css, globals.css
└── guidelines/                  # Figma design guidelines
```

Files marked `(planned)` don't exist yet — they're the target structure for the voice pipeline. `main.py` is currently a one-endpoint stub that returns hardcoded TwiML to confirm the Twilio webhook is wired.

---

## Local setup

You need three things running concurrently during development: the FastAPI server, an ngrok tunnel pointing at it, and (separately) the dashboard dev server.

### One-time Python setup

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

`requirements.txt` currently only pins `fastapi` and `uvicorn[standard]`. As the voice pipeline lands, add: `anthropic`, `elevenlabs`, `twilio`, `python-dotenv`.

### `.env` (gitignored)

Create `.env` at the repo root. None of these are wired into code yet beyond what Twilio needs, but all four will be required by the time the pipeline lands:

```
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

ngrok auth (one-time, if not already done):

```bash
ngrok config add-authtoken <token>
```

### Running the voice pipeline (FastAPI + Twilio)

Three terminals:

**Terminal 1 — FastAPI:**

```bash
source .venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 — ngrok:**

```bash
ngrok http 8000
```

Copy the `https://...ngrok-free.app` forwarding URL. ngrok URLs change every restart on the free tier — when ngrok restarts, the Twilio webhook must be repointed.

**Terminal 3 — Twilio webhook (one-time per ngrok session):**
The Twilio number is already purchased and its Voice webhook is pointed at `<ngrok-url>/voice` (HTTP POST). If ngrok restarts and the URL changes, update the webhook in Twilio Console → Phone Numbers → Active Numbers → (the number) → Voice Configuration → "A call comes in".

Smoke test: call the Twilio number. The current stub plays `"Hello, this is the Rosewood Sand Hill concierge. The pipe is working. Goodbye."` and hangs up. If you hear that, the round trip works.

### Running the dashboard

```bash
npm install        # first time only
npm run dev
```

Vite serves the dashboard at `http://localhost:5173`. The WebSocket connection to FastAPI (`ws://localhost:8000/ws` once that endpoint exists) runs separately from Vite's dev server — Vite is frontend-only.

---

## Seed data (do not change without coordination)

The demo runs on a single guest persona: **Mr. Tanaka**.

- Phone: `+1XXXXXXXXXX` (whichever phone is used in the demo — must match Twilio caller ID)
- Past stays:
  - Sept 2023: engagement weekend, corner suite with oak tree view
  - Mar 2024: business trip, standard king
- Preferences:
  - Wife is vegetarian
  - Prefers Sancerre
  - Quiet seating
  - Room temperature ~68°F, extra duvet
  - Early breakfast on business trips
- Flight today: UA241 from HND, ETA 16:32 PT
- Notable context: anniversary this weekend

Today's local context at Rosewood Sand Hill:
- Weather: 68°F, clear, sunset 19:42
- Sommelier's pick: Sancerre, Loire Valley 2021
- On duty: Chef Marie (known for quiet anniversary surprises)
- Events: Live jazz on the patio 18:00–20:00
- Facilities: Madera restaurant, Sense spa, patio, pool, tennis courts

These details are loaded into the agent's system prompt for every call. They are designed to enable the canonical anticipatory offer (anniversary → engagement weekend recall → Chef Marie bridge → off-the-bill proposal).

---

## How to add or change behavior

### Adding a new conversation rule

1. Edit `prompts.py`
2. Add to the relevant section of the system prompt
3. Re-test all four canonical paths in `/tests/conversation_paths.md`
4. Verify the anticipatory offer still fires reliably

### Adding a new action type

1. Add the action type constant to `db.py`
2. Update the JSON schema in the Claude system prompt so it knows the new type
3. Add the handler in `conversation.py` that writes to SQLite + emits WebSocket event
4. Coordinate with Rahul to render the new action type in the dashboard

### Changing the voice

1. Find new voice ID on elevenlabs.io
2. Update `VOICE_ID` constant in `synthesis.py`
3. **Re-generate the cached opening hook MP3** (otherwise the greeting will be in the old voice)
4. Test latency — different voices have different generation times

### Adding a new guest persona

For the demo, you do not need this. There is one guest. If you find yourself adding guest #2, you are over-engineering. Stop.

---

## Behavior the agent must never exhibit

- **Never sound like a script or checklist.** No "Let me ask you a few questions." No "First, can you confirm..."
- **Never ask multiple questions in one turn.** One question at a time.
- **Never interrogate.** The 5 latent fields (college, work, hobbies, family, age) are extracted opportunistically from natural conversation. Never asked about directly.
- **Never reference data the guest didn't reveal.** No "I see from your past stays that..." unless the guest brought up that visit first.
- **Never end generically.** Every closing must reference something specific the guest said. "Safe travels, and we'll have the Sancerre ready" — not "Have a great day."
- **Never make up information.** If the guest asks about something not in the local context (e.g., "is the spa open at 11pm?"), the agent should say "Let me have the team confirm that and follow up by text" — not invent an answer.
- **Never apologize for being an AI or break character.** The agent is the Rosewood arrival concierge. That's the role. Stay in it.

---

## Demo-specific shortcuts (intentional, not bugs)

This codebase contains deliberate hacks that exist only because this is a hackathon demo. Do not "fix" them.

- **Single hardcoded guest.** No multi-tenancy, no guest management UI, no authentication. There is one guest in the database (Tanaka) and one phone number that maps to him.
- **In-memory conversation history.** Conversations are stored in a Python dict keyed by Twilio's `CallSid`. They are lost on server restart. This is fine for a demo.
- **Mocked flight data.** No real flight tracker API. Today's flight is hardcoded in local context.
- **Mocked local context.** No real weather API. The 68°F is hardcoded.
- **Pre-generated opening hook.** The MP3 is generated once at server startup and reused for every call. There is no per-call personalization in the opening beyond Tanaka's name.
- **Static facilities list.** No dynamic Rosewood facilities lookup. The list lives in `data.py`.
- **Fake-live toggle.** There is a config flag that lets the demo use pre-rendered audio for the headline anticipatory offer response, in case ElevenLabs latency spikes during the demo. This is intentional demo insurance.

If you're tempted to add a "real" version of any of these, ask yourself: does this make the 3-minute demo better? If not, don't touch it.

---

## Testing

The canonical tests are conversation paths, not unit tests. See `/tests/conversation_paths.md`.

Four canonical paths must produce a valid anticipatory offer:

1. **The anniversary path:** Guest mentions "It's our anniversary." Expected offer references the engagement weekend + Chef Marie.
2. **The flight path:** Guest mentions "long flight from Tokyo." Expected offer references prior pattern of skipping first-night dinner + proposes a soft schedule.
3. **The constraint path:** Guest mentions "vegetarian, somewhere quiet." Expected offer matches Sancerre (today's pick) to known preference.
4. **The business path:** Guest mentions "working trip." Expected offer references early breakfast pattern + offers to keep evenings open.

If any path stops producing a coherent offer after a code change, that change must be reverted or fixed before merge.

Latency tests: every turn must complete in under 2 seconds (measured from end of guest speech to start of agent audio playback). If a change adds >200ms to a turn, it requires justification.

---

## Failure modes and recovery

### If ElevenLabs is slow or returns an error
Fall back to the cached MP3 for the canonical anticipatory offer. The fake-live toggle should be on by default during the demo. Log the failure but continue the call.

### If Claude returns unparseable JSON for actions
Log the spoken response normally. Skip the action logging for that turn. The conversation continues; the dashboard misses one event.

### If Twilio can't reach the server
The call drops on the guest's end. There is no recovery from this mid-demo. Mitigation: keep ngrok stable, keep the laptop awake, test the round-trip from the actual demo room before the demo begins.

### If a guest says something Claude doesn't know how to handle
The system prompt instructs Claude to redirect gracefully: "Let me have the team look into that. What else can I help with for your arrival?" This is the universal escape hatch.

---

## What "done" looks like

The MVP is shippable when:

- A call to the Twilio number triggers the personalized opening hook within 1 second
- A 5-turn conversation completes with all turns under 2.5 seconds latency
- The anticipatory offer fires in turns 2–4 across all four canonical paths
- Each turn's actions appear on the dashboard via WebSocket
- At call end, a briefing card renders with realistic data
- The whole flow can be demonstrated three times in a row without failure

Polish items (do these only after MVP is solid):
- Visual animations on the dashboard
- The "restraint counter" widget
- The SMS confirmation to the guest's phone
- A second briefing card variant for housekeeping
- Ambient background music for the demo room

Anti-goals (do NOT build these):
- A web frontend for guests
- A login system
- A mobile app
- A real flight tracker integration
- A real weather API integration
- A "settings" page for the agent
- Multi-language support
- A second guest persona
- Returning-guest detection beyond the one hardcoded number

---

## Working agreements for agents editing this codebase

When you (an AI agent) are asked to modify this project:

1. **Read this file completely before making changes.** Especially the latency budget and the anticipatory offer section.
2. **Default to the smallest change that works.** This is a 7-hour build. The shortest path is usually the right one.
3. **Never introduce a new dependency without strong justification.** The tech stack is intentionally minimal.
4. **Never break the latency budget.** If a change would add latency to the hot path, flag it and propose an alternative.
5. **Never modify the seed data without coordination.** The demo depends on Tanaka's profile aligning with the local context to enable the canonical offer.
6. **Never replace deliberate demo shortcuts with "real" implementations.** If you see something that looks like a hack, check this file first to confirm whether it's intentional.
7. **When in doubt, optimize for the 3-minute demo, not for code quality.** Clarity > cleverness. Demo reliability > production readiness.

When proposing a change:
- State which canonical conversation paths you tested it against
- State the measured latency impact on a typical turn
- State whether it touches the anticipatory offer logic

---

## Team

- **Sid:** voice pipeline (Twilio, ElevenLabs, Claude prompting, conversation logic)
- **Rahul:** dashboard, synthesis visualization, briefing card UI
- **Both:** seed data, briefing card design, demo rehearsal

On stage during the demo:
- One person speaks and faces judges
- One person operates the laptop (manual cue advances, no autoplay)

Decide who does which role in hour 6, not hour 7.

---

## The one sentence

**Build for the 3-minute demo. The anticipatory offer is the entire product. Everything else is plumbing.**
