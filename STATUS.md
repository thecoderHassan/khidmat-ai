# KhidmatAI — Team Status & Handoff Doc
**Last updated: 2026-05-17**

---

## Team Branches & Ownership

| Branch | Person | Owns |
|---|---|---|
| `agents` | Abdrehman | `backend/agents/*.py`, `backend/utils/*.py`, `antigravity/prompts/` |
| `backend` | Sami | `backend/main.py`, routes, `backend/data/providers.json`, Docker, Cloud Run |
| `mobile` | Aqib | `mobile/` all screens |

**Critical rule:** Abdrehman reads `providers.json` but never commits it. Sami owns it.

---

## Architecture: User-in-the-Loop (DECIDED)

```
Phase 1 — POST /analyze
  Agent 1 (Intent) → Agent 2 (Discovery + Ranking)
  Returns: top_match + alternatives → App shows list to user

Phase 2 — POST /book  (user tapped a provider)
  Agent 3 (Confirmation) → Agent 4 (Booking)
  Returns: booking_id + receipt → App shows confirmation
```

Sami's endpoint names: `/analyze` and `/book` (not `/api/request` and `/api/book`).

---

## What Is Built (agents branch — all tested)

### Agent 1 — `backend/agents/intent.py`
- Calls Gemini API (`gemini-2.0-flash`) via `google-genai` SDK
- Supports Urdu, Roman Urdu, English, Mixed
- **MOCK MODE:** `MOCK_INTENT=true` in `.env` bypasses Gemini and uses keyword parser
- Mock mode is currently ON because Gemini API key has `limit: 0` quota issue
- When API key is fixed → set `MOCK_INTENT=false`, no code changes needed

**Input:**
```json
{ "message": "Mujhe kal subah G-13 mein AC technician chahiye", "session_id": "SES-001" }
```
**Output:**
```json
{
  "service_type": "AC Technician",
  "location": "G-13",
  "time_preference": "Tomorrow morning",
  "time_iso": "2026-05-18T09:00:00",
  "language_detected": "Roman Urdu",
  "session_id": "SES-001"
}
```

### Agent 2 — `backend/agents/discovery.py`
- Reads `backend/data/providers.json` (Sami's file)
- Filters by service_type + available: true
- Computes distance using haversine (lat/lng from providers.json)
- Matches requested time_iso to nearest available slot (ISO string comparison)
- Sorts by distance

**Input:** Agent 1 output
**Output:**
```json
{
  "providers": [
    { "provider_id": "PRV-001", "name": "Ali AC Services",
      "distance_km": 0.0, "rating": 4.8,
      "matched_slot": "2026-05-18T09:00:00", ... }
  ],
  "service_type": "AC Technician",
  "location": "G-13",
  "time_iso": "2026-05-18T09:00:00",
  "session_id": "SES-001"
}
```

### Utilities — all in `backend/utils/`

| File | Function | What it does |
|---|---|---|
| `helpers.py` | `normalize_time()` | "Kal subah" → "2026-05-18T09:00:00" (ISO 8601) |
| `logger.py` | `write_trace()` | Writes agent step to `logs/agent_trace_{session_id}.json` |
| `maps.py` | `haversine_km()` | Distance between two lat/lng points |
| `maps.py` | `get_area_coords()` | "G-13" → (33.6844, 73.0479) — Islamabad lookup table |

---

## What Is NOT Built Yet (Abdrehman's remaining work)

### Agent 2 UPDATE — Add Ranking to Discovery
Discovery currently returns a flat sorted list. It needs to also rank and return `top_match + alternatives`.

**Ranking formula (from README):**
```
score = (0.40 × proximity_score) + (0.40 × rating_score) + (0.20 × availability_score)
proximity_score    = 1 - (distance_km / max_distance_km)
rating_score       = (rating - 1) / 4
availability_score = 1 if available else 0
```

**Updated output format:**
```json
{
  "top_match": {
    "provider_id": "PRV-001", "name": "Ali AC Services",
    "distance_km": 0.0, "rating": 4.8,
    "matched_slot": "2026-05-18T09:00:00",
    "score": 94, "price_range": "PKR 500-1500", "phone": "+92-300-0000001"
  },
  "alternatives": [ { ...same fields... }, { ... } ],
  "session_id": "SES-001"
}
```

### Agent 3 — `backend/agents/confirmation.py`
Triggered by POST /book after user taps a provider.

**Input:**
```json
{
  "provider_id": "PRV-001",
  "slot": "2026-05-18T09:00:00",
  "service_type": "AC Technician",
  "session_id": "SES-001"
}
```
**Output:**
```json
{
  "provider": { ...full provider object from providers.json... },
  "confirmed_slot": "2026-05-18T09:00:00",
  "reasoning_text": "Ali AC Services selected — closest (0.0km), rating 4.8, available at 09:00.",
  "session_id": "SES-001"
}
```

### Agent 4 — `backend/agents/booking.py`
**Input:** Agent 3 output
**Output:**
```json
{
  "booking_id": "BK-20260518-00142",
  "provider_name": "Ali AC Services",
  "service_type": "AC Technician",
  "confirmed_slot": "2026-05-18T09:00:00",
  "provider_phone": "+92-300-0000001",
  "price_range": "PKR 500-1500",
  "receipt_text": "Booking confirmed! Ali AC Services will arrive at G-13 on 18 May at 9:00 AM. Contact: +92-300-0000001. Booking ID: BK-20260518-00142.",
  "session_id": "SES-001"
}
```

### Antigravity Prompts — `antigravity/prompts/`
All 4 files are stubs. These need to be filled with prompts that call Sami's endpoints.
Build these AFTER agents 3 and 4 are done.

---

## Key Technical Decisions Made

| Decision | What | Why |
|---|---|---|
| `time_iso` format | `"2026-05-18T09:00:00"` (ISO 8601) | Sami flagged missing T separator |
| Agent 3 filename | `confirmation.py` (was `recommendation.py`) | Sami flagged naming confusion |
| Slot format | Full ISO strings in providers.json | Aligned with Sami's updated data |
| SDK | `google-genai` (not `google-generativeai`) | Old SDK deprecated |
| Model | `gemini-2.0-flash` | Confirmed available for this key |
| Mock mode | `MOCK_INTENT=true` in `.env` | Gemini quota blocked, mock works perfectly |

---

## Environment Setup (on this machine)

```
Python: D:\Python311\python.exe
Packages installed to: D:\Python311\Lib\site-packages  (pip has global target=D:\pip-packages, must use --target to override)
Working dir for running agents: d:\khidmat-ai\khidmat-ai\backend\
Run command: D:/Python311/python.exe <script>.py
```

`.env` file location: `d:\khidmat-ai\khidmat-ai\.env`
Current `.env` has:
- `GEMINI_API_KEY` — set but quota blocked (limit: 0)
- `MOCK_INTENT=true` — bypasses Gemini, use keyword parser

---

## Gemini API Key Issue

**Problem:** All keys show `limit: 0` for `generateContent` on free tier.
**Root cause:** Google account-level restriction, not key-specific.
**Status:** Ongoing — try a teammate's Google account key.
**Workaround:** `MOCK_INTENT=true` — full pipeline works end-to-end without Gemini.
**To fix:** Set `MOCK_INTENT=false` once a working key is in `.env`.

---

## For Sami (Backend)

Wire these two routes in `main.py`:

```python
@app.post("/analyze")
def analyze(body: dict):
    from agents.intent import run as intent_run
    from agents.discovery import run as discovery_run
    intent_result = intent_run(body)
    return discovery_run(intent_result)   # returns top_match + alternatives

@app.post("/book")
def book(body: dict):
    # body = { "provider_id": "PRV-001", "slot": "2026-05-18T09:00:00", "service_type": "...", "session_id": "..." }
    from agents.confirmation import run as conf_run
    from agents.booking import run as booking_run
    conf_result = conf_run(body)
    return booking_run(conf_result)
```

---

## For Aqib (Mobile)

| Screen | API Call | On success |
|---|---|---|
| ChatScreen | `POST /analyze` with `{message}` | Navigate to ProviderResultsScreen |
| ProviderResultsScreen | (display top_match + alternatives) | User taps → navigate to AgentThinkingScreen |
| AgentThinkingScreen | `POST /book` with `{provider_id, slot, service_type, session_id}` | Navigate to BookingConfirmScreen |
| BookingConfirmScreen | (display receipt) | Done |

---

## Pending / Blockers

| Item | Owner | Status |
|---|---|---|
| Gemini API key fix | Abdrehman | Blocked — try teammate's account |
| Agent 2 ranking update (top_match + score) | Abdrehman | Next task |
| Agent 3 (confirmation.py) | Abdrehman | Next task |
| Agent 4 (booking.py) | Abdrehman | Next task |
| Antigravity prompts (4 files) | Abdrehman | After agents done |
| main.py route wiring (/analyze, /book) | Sami | In progress |
| providers.json update (30 providers, ISO slots) | Sami | In progress |
| Mobile screens | Aqib | In progress |

---

## Deadline: May 20, 2026 (3 days left)
