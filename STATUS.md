# KhidmatAI — Team Status & Handoff Doc
**Last updated: 2026-05-17**

---

## Team Branches

| Branch | Person | Responsibility |
|---|---|---|
| `agents` | Abdrehman | 4 Python agents + utils |
| `backend` | Sami | FastAPI `main.py`, routes, Docker, Cloud Run deploy |
| `mobile` | Aqib | React Native screens |

---

## Architecture Decision: User-in-the-Loop

We are NOT doing fully automated booking. The user sees providers and picks one.

```
Phase 1 — User sends message
────────────────────────────
Agent 1 (Intent) → Agent 2 (Discovery + Ranking)
→ Returns: top_match + alternatives list → App displays to user

Phase 2 — User taps a provider
────────────────────────────────
Agent 3 (Confirmation) → Agent 4 (Booking)
→ Returns: booking_id + receipt → App shows confirmation screen
```

**Two API routes (Sami to implement in main.py):**

| Route | Triggers | Returns |
|---|---|---|
| `POST /api/request` | Agent 1 → Agent 2 | Ranked provider list |
| `POST /api/book` | Agent 3 → Agent 4 | Booking confirmation + receipt |

---

## What Is Built (agents branch)

### Agent 1 — Intent Agent `backend/agents/intent.py`
**Status: Built. Needs working Gemini API key to test.**

- Calls Gemini API (`gemini-2.0-flash`) to parse natural language
- Supports Urdu, Roman Urdu, English, Mixed
- Normalizes time: `"Kal subah"` → `"2026-05-18 09:00"` (via `utils/helpers.py`)
- Writes trace log to `logs/agent_trace_{session_id}.json`

**Input:**
```json
{ "message": "Mujhe kal subah G-13 mein AC technician chahiye" }
```

**Output:**
```json
{
  "service_type": "AC Technician",
  "location": "G-13",
  "time_preference": "Tomorrow morning",
  "time_iso": "2026-05-18 09:00",
  "language_detected": "Roman Urdu",
  "session_id": "SES-20260517-001"
}
```

---

### Agent 2 — Discovery Agent `backend/agents/discovery.py`
**Status: Built and tested. No API key needed.**

- Reads `backend/data/providers.json`
- Filters by `service_type` + `available: true`
- Computes distance using haversine formula (lat/lng from JSON)
- Matches requested time to nearest available slot
- Sorts by distance
- **Ranking (top_match + alternatives) to be added next**

**Input:** (Agent 1 output)
```json
{
  "service_type": "AC Technician",
  "location": "G-13",
  "time_iso": "2026-05-18 09:00",
  "session_id": "SES-20260517-001"
}
```

**Output:**
```json
{
  "providers": [
    {
      "provider_id": "PRV-001",
      "name": "Ali AC Services",
      "distance_km": 0.0,
      "rating": 4.8,
      "available_slots": ["09:00", "10:00", "14:00"],
      "matched_slot": "09:00",
      "price_range": "PKR 500-1500",
      "phone": "+92-300-0000001"
    }
  ],
  "service_type": "AC Technician",
  "location": "G-13",
  "time_iso": "2026-05-18 09:00",
  "session_id": "SES-20260517-001"
}
```

---

### Utilities Built

| File | Purpose | Status |
|---|---|---|
| `backend/utils/helpers.py` | `normalize_time()` — converts natural language time to ISO | Done |
| `backend/utils/logger.py` | `write_trace()` — writes agent step to JSON log file | Done |
| `backend/utils/maps.py` | `haversine_km()` + Islamabad area coordinates lookup | Done |

---

## What Is NOT Built Yet

### Agent 2 (update) — Add Ranking
Discovery Agent needs to be updated to also score and rank providers before returning.

**Ranking formula:**
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
    "provider_id": "PRV-001",
    "name": "Ali AC Services",
    "distance_km": 1.2,
    "rating": 4.8,
    "matched_slot": "09:00",
    "score": 94,
    "price_range": "PKR 500-1500",
    "phone": "+92-300-0000001"
  },
  "alternatives": [ { ...same fields... }, { ...} ],
  "session_id": "SES-20260517-001"
}
```

---

### Agent 3 — Confirmation Agent `backend/agents/recommendation.py`
**Status: Empty stub.**

- Triggered after user taps a provider in the app
- Input: the provider the user selected + session context
- Validates the slot is still available
- Generates reasoning text in Urdu/English
- Passes to Agent 4

**Input:** (from `/api/book` route)
```json
{
  "provider_id": "PRV-001",
  "slot": "09:00",
  "service_type": "AC Technician",
  "session_id": "SES-20260517-001"
}
```

**Output:**
```json
{
  "provider": { ...full provider object... },
  "confirmed_slot": "09:00",
  "reasoning_text": "Ali AC Services selected — closest provider (0.0km), highest rating (4.8★), available at 09:00.",
  "session_id": "SES-20260517-001"
}
```

---

### Agent 4 — Booking Agent `backend/agents/booking.py`
**Status: Empty stub.**

- Writes confirmed booking to `backend/data/bookings.json`
- Generates booking ID: `BK-YYYYMMDD-XXXXX`
- Returns full receipt

**Output:**
```json
{
  "booking_id": "BK-20260518-00142",
  "provider_name": "Ali AC Services",
  "service_type": "AC Technician",
  "confirmed_slot": "2026-05-18 09:00",
  "provider_phone": "+92-300-0000001",
  "price_range": "PKR 500-1500",
  "receipt_text": "Booking confirmed! Ali AC Services will arrive at G-13 on 18 May at 9:00 AM. Contact: +92-300-0000001. Booking ID: BK-20260518-00142.",
  "session_id": "SES-20260517-001"
}
```

---

## For Sami (Backend)

`main.py` needs these two routes wired up:

```python
# Route 1 — user sends a message
@app.post("/api/request")
def handle_request(body: dict):
    from agents.intent import run as intent_run
    from agents.discovery import run as discovery_run
    intent_result = intent_run(body)
    discovery_result = discovery_run(intent_result)
    return discovery_result   # top_match + alternatives

# Route 2 — user taps a provider and books
@app.post("/api/book")
def handle_book(body: dict):
    # body = { "provider_id": "PRV-001", "slot": "09:00", "service_type": "...", "session_id": "..." }
    from agents.recommendation import run as rec_run
    from agents.booking import run as booking_run
    rec_result = rec_run(body)
    booking_result = booking_run(rec_result)
    return booking_result   # booking_id + receipt
```

Also needed:
- `GET /api/providers` → reads `providers.json` (all providers)
- `GET /api/providers/{category}` → filters by category
- `GET /api/booking/{id}` → reads from `bookings.json`
- `GET /api/trace/{session_id}` → reads from `logs/`

**Run locally:**
```bash
cd backend
uvicorn main:app --reload
```

---

## For Aqib (Mobile)

Two main screens to wire up to the API:

| Screen | Calls | Displays |
|---|---|---|
| `ChatScreen` | `POST /api/request` | Input box, send button |
| `AgentThinkingScreen` | (loading state) | Spinner while agents run |
| `ProviderResultsScreen` | (receives response) | top_match card + alternatives list |
| `BookingConfirmScreen` | `POST /api/book` | Receipt with booking ID |

`services/api.js` is already set up with `submitRequest()` and `getBooking()`.

Backend runs at `http://localhost:8000` locally. Cloud Run URL to be added once Sami deploys.

---

## Pending / Blockers

| Item | Owner | Status |
|---|---|---|
| Gemini API key with working quota | Abdrehman | Blocked — free tier shows limit:0 |
| Agent 2 ranking update | Abdrehman | Next task |
| Agent 3 (Confirmation) | Abdrehman | Not started |
| Agent 4 (Booking) | Abdrehman | Not started |
| main.py route wiring | Sami | Not started |
| Cloud Run deploy | Sami | Not started |
| Mobile screens | Aqib | Not started |
| Expand providers.json (10 → 50 providers) | Anyone | Not started |

---

## Data Files

| File | Contents | Notes |
|---|---|---|
| `backend/data/providers.json` | 10 providers (1 per category) | Needs more providers for realistic demo |
| `backend/data/bookings.json` | Empty array `[]` | Written to at runtime by Agent 4 |
| `logs/agent_trace_*.json` | Agent step logs | Auto-generated when agents run |

---

## Deadline: May 20, 2026 (3 days left)
