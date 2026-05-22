# 🔧 KhidmatAI — AI Service Orchestrator for Informal Economy

> **Hackathon Project** | Challenge 2: AI Service Orchestrator
> Built with **Google Antigravity** · Powered by **Gemini 2.0 Flash** · Deployed on **Google Cloud Run**

---

## 📌 Overview

KhidmatAI is a **User-in-the-Loop** agentic AI system that automates the end-to-end lifecycle of a home service request — from a natural language message (Urdu, Roman Urdu, or English) to provider matching, user confirmation, booking simulation, and follow-up.

It targets Pakistan's **informal economy** across **10 service categories** — plumbers, electricians, AC technicians, tutors, beauticians, carpenters, painters, drivers, maids, and delivery workers — where most transactions happen through WhatsApp and phone calls.

**Example input:**
```
"Mujhe kal subah G-13 mein AC technician chahiye"
```

**System output:**
```
Service:    AC Technician
Location:   G-13, Islamabad
Time:       2026-05-18T09:00:00
Provider:   Ali AC Services (0.0 km away, ⭐ 4.8, score: 94)
Booking:    Confirmed — ID: BK-20260518-00142
Receipt:    Ali AC Services will arrive at G-13 on 18 May at 9:00 AM.
            Contact: +92-300-0000001
```

---

## ✅ Final Tech Stack

| Item | Decision |
|---|---|
| **Mobile** | React Native + Expo |
| **Backend** | Python + FastAPI |
| **AI Model** | Gemini 2.0 Flash (`gemini-2.0-flash`) |
| **AI SDK** | `google-genai` |
| **Orchestration** | Google Antigravity — 4 agents |
| **Data** | JSON mock (`providers.json`, `bookings.json`) |
| **Maps / Distance** | Haversine formula (no paid Maps API) |
| **Deployment** | Google Cloud Run |
| **Version Control** | GitHub |
| **Services** | 10 informal economy categories |
| **Database** | None — JSON only |
| **Language** | Python backend + JavaScript mobile |

---

## 🏗️ System Architecture — User-in-the-Loop

The pipeline runs in **two phases**. After Phase 1, the user sees the matched providers and taps one to confirm before booking happens.

```
User Input (React Native + Expo)
        │
        ▼
┌──────────────────────────────────────────────────┐
│  Phase 1 — POST /analyze                         │
│                                                  │
│  Agent 1: Intent Agent (intent.py)               │
│  ├── Gemini 2.0 Flash (or Mock parser)           │
│  └── Output: service_type, location,             │
│              time_iso, language_detected         │
│                                                  │
│  Agent 2: Discovery Agent (discovery.py)         │
│  ├── Filter providers.json by service + avail.   │
│  ├── Haversine distance from user location       │
│  ├── ISO slot matching to time_iso               │
│  └── Output: top_match + alternatives (ranked)  │
│                                                  │
│       ↓  App shows provider list to user         │
│       ↓  User taps a provider                    │
│                                                  │
│  Phase 2 — POST /book                            │
│                                                  │
│  Agent 3: Confirmation Agent (confirmation.py)   │
│  ├── Validates selected provider + slot          │
│  └── Output: confirmed provider + reasoning      │
│                                                  │
│  Agent 4: Booking Agent (booking.py)             │
│  ├── Writes to bookings.json                     │
│  └── Output: booking_id + receipt_text           │
└──────────────────────────────────────────────────┘
        │
        ▼
React Native App (Android + iOS via Expo)
```

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/analyze` | Phase 1 — parse intent, discover + rank providers |
| `POST` | `/book` | Phase 2 — confirm slot, write booking, return receipt |
| `GET` | `/api/providers` | List all providers from JSON |
| `GET` | `/api/providers/{category}` | Filter by service category |
| `GET` | `/api/booking/{id}` | Get booking by ID |
| `GET` | `/api/trace/{session_id}` | Get full agent trace log |

### POST `/analyze` — Request / Response

**Request:**
```json
{
  "message": "Mujhe kal subah G-13 mein AC technician chahiye",
  "session_id": "SES-001"
}
```

**Response:**
```json
{
  "top_match": {
    "provider_id": "PRV-001",
    "name": "Ali AC Services",
    "distance_km": 0.0,
    "rating": 4.8,
    "matched_slot": "2026-05-18T09:00:00",
    "score": 94,
    "price_range": "PKR 500-1500",
    "phone": "+92-300-0000001"
  },
  "alternatives": [ { "...same fields..." } ],
  "session_id": "SES-001"
}
```

### POST `/book` — Request / Response

**Request:**
```json
{
  "provider_id": "PRV-001",
  "slot": "2026-05-18T09:00:00",
  "service_type": "AC Technician",
  "session_id": "SES-001"
}
```

**Response:**
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

---

## 🤖 Agents — What's Built

### Agent 1 — `backend/agents/intent.py` ✅ Done

- Calls `gemini-2.0-flash` via `google-genai` SDK
- Supports Urdu, Roman Urdu, English, Mixed input
- **Mock mode**: set `MOCK_INTENT=true` in `.env` to bypass Gemini and use keyword parser — no code changes needed
- Returns structured intent with ISO 8601 time (`"2026-05-18T09:00:00"`)

**Input → Output:**
```
{ "message": "...", "session_id": "SES-001" }
→
{
  "service_type": "AC Technician",
  "location": "G-13",
  "time_preference": "Tomorrow morning",
  "time_iso": "2026-05-18T09:00:00",
  "language_detected": "Roman Urdu",
  "session_id": "SES-001"
}
```

### Agent 2 — `backend/agents/discovery.py` ✅ Done (ranking update pending)

- Reads `backend/data/providers.json`
- Filters by `service_type` + `available: true`
- Computes distance with haversine using provider lat/lng
- Matches `time_iso` to nearest available slot
- Sorts by distance — **ranking formula (score 0–100) being added**

### Agent 3 — `backend/agents/confirmation.py` 🔄 In Progress

- Triggered by `POST /book` after user selects a provider
- Validates provider + slot still available
- Generates `reasoning_text` explaining why this provider was confirmed

### Agent 4 — `backend/agents/booking.py` 🔄 In Progress

- Writes confirmed booking to `backend/data/bookings.json`
- Generates `booking_id` in format `BK-YYYYMMDD-NNNNN`
- Returns `receipt_text` for display in mobile app

---

## 🛠️ Utilities — `backend/utils/`

| File | Function | What it does |
|---|---|---|
| `helpers.py` | `normalize_time()` | `"Kal subah"` → `"2026-05-18T09:00:00"` (ISO 8601) |
| `logger.py` | `write_trace()` | Writes each agent step to `logs/agent_trace_{session_id}.json` |
| `maps.py` | `haversine_km()` | Distance between two lat/lng points (no Maps API needed) |
| `maps.py` | `get_area_coords()` | `"G-13"` → `(33.6844, 73.0479)` — Islamabad area lookup table |

---

## 🧠 Ranking Algorithm

Providers are ranked using a **composite weighted score (0–100)**:

```
score = (0.40 × proximity_score)
      + (0.40 × rating_score)
      + (0.20 × availability_score)

proximity_score    = 1 - (distance_km / max_distance_km)
rating_score       = (rating - 1) / 4        # normalised 1–5 → 0–1
availability_score = 1 if available else 0

final_score        = round(raw_score × 100)  # returned as integer 0–100
```

Agent 3 also generates a plain-language reasoning string:
> `"Ali AC Services selected — closest (0.0km), rating 4.8, available at 09:00."`

---

## 🔧 How Google Antigravity Is Used

Antigravity is the **core orchestration platform**. All 4 agents are authored and run through Antigravity's Agent Manager.

### 4-Agent Pipeline in Antigravity

```
[User sends message]
      │
      ▼ Antigravity Agent Manager — Phase 1
      ├─ Agent 1 — Intent Agent
      │     Tool: Gemini 2.0 Flash / Mock parser
      │     Output: { service_type, location, time_iso, language_detected }
      │
      └─ Agent 2 — Discovery Agent
            Tool: providers.json + haversine (maps.py)
            Output: { top_match, alternatives }

[User taps provider in app]
      │
      ▼ Antigravity Agent Manager — Phase 2
      ├─ Agent 3 — Confirmation Agent
      │     Output: { provider, confirmed_slot, reasoning_text }
      │
      └─ Agent 4 — Booking Agent
            Tool: bookings.json write (logger.py trace)
            Output: { booking_id, receipt_text }
```

### MCP Integrations (inside Antigravity)

| MCP Server | Used For |
|---|---|
| **GitHub MCP** | Push code, create branches, open PRs from prompts |
| **Cloud Run MCP** | Deploy and update the FastAPI backend |

---

## 🗂️ Project Structure

```
khidmat-ai/
│
├── antigravity/
│   ├── agent_rules.md              # Antigravity agent behavior rules
│   ├── mcp_config.json             # MCP config (GitHub, Cloud Run)
│   └── prompts/                    # Agent prompts (stubs — to be filled)
│       ├── intent_agent.md
│       ├── discovery_agent.md
│       ├── confirmation_agent.md
│       └── booking_agent.md
│
├── backend/                        # Python + FastAPI
│   ├── main.py                     # FastAPI — /analyze and /book endpoints
│   ├── agents/
│   │   ├── intent.py               # ✅ Gemini 2.0 Flash + mock mode
│   │   ├── discovery.py            # ✅ Haversine + ISO slot matching
│   │   ├── confirmation.py         # ✅ 
│   │   └── booking.py              # ✅ 
│   ├── utils/
│   │   ├── helpers.py              # normalize_time() — Urdu/English → ISO 8601
│   │   ├── logger.py               # write_trace() — per-session JSON logs
│   │   └── maps.py                 # haversine_km(), get_area_coords()
│   ├── data/
│   │   ├── providers.json          # Mock providers — owned by Sami (backend branch)
│   │   └── bookings.json           # Written at runtime by booking agent
│   ├── Dockerfile
│   └── requirements.txt
│
├── mobile/                         # React Native + Expo — owned by Aqib
│   ├── App.js
│   ├── screens/
│   │   ├── ChatScreen.js
│   │   ├── AgentThinkingScreen.js
│   │   ├── ProviderResultsScreen.js
│   │   └── BookingConfirmScreen.js
│   ├── services/
│   │   └── api.js                  # Calls /analyze and /book
│   ├── app.json
│   └── package.json
│
├── logs/
│   ├── sample_agent_trace.json     # Sample trace for submission
│   └── agent_trace_{session_id}.json  # Written at runtime per session
│
├── docs/
│   └── architecture_diagram.png
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   └── workflows/ci.yml            # CI check on push to dev/main
│
├── STATUS.md                       # 👈 Team handoff doc — read this first
├── CONTRIBUTING.md                 # Branch rules, commit format, ownership
├── .env.example
├── deploy.sh                       # One-click Cloud Run deploy
└── README.md
```

---

## 👥 Team & Branch Ownership

| Branch | Person | Owns |
|---|---|---|
| `agents` | Abdrehman | `backend/agents/*.py`, `backend/utils/*.py`, `antigravity/prompts/` |
| `backend` | Sami | `backend/main.py`, routes, `backend/data/providers.json`, Docker, Cloud Run |
| `mobile` | Aqib | `mobile/` — all screens |

> **Critical rule:** Abdrehman reads `providers.json` but **never commits it**. Sami owns it.

---

## ⚙️ Environment Variables

```bash
# .env — copy from .env.example and fill in
GEMINI_API_KEY=your_gemini_api_key_here
GCP_PROJECT_ID=your_gcp_project_id
GCP_REGION=asia-south1
APP_ENV=development

# Mock mode — set true to bypass Gemini (keyword parser fallback)
MOCK_INTENT=false
```

> **If you hit Gemini quota issues** set `MOCK_INTENT=true`. The keyword parser runs instead — no code changes needed.

---

## 🚀 Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env     # fill in your keys
uvicorn main:app --reload      # runs at http://localhost:8000
```

Test Phase 1:
```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"message": "Mujhe kal subah G-13 mein AC technician chahiye", "session_id": "SES-001"}'
```

Test Phase 2:
```bash
curl -X POST http://localhost:8000/book \
  -H "Content-Type: application/json" \
  -d '{"provider_id": "PRV-001", "slot": "2026-05-18T09:00:00", "service_type": "AC Technician", "session_id": "SES-001"}'
```

### Mobile

```bash
cd mobile
npm install
npx expo start
# Scan QR code with Expo Go on your phone
```

---

## ☁️ Cloud Run Deployment

```bash
# 1 — Build and push Docker image
cd backend
docker build -t asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/khidmat-ai/backend:latest .
docker push asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/khidmat-ai/backend:latest

# 2 — Deploy to Cloud Run
gcloud run deploy khidmat-ai-backend \
  --image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/khidmat-ai/backend:latest \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY,MOCK_INTENT=false

# Or use the one-click script:
chmod +x deploy.sh && ./deploy.sh
```

---

## ☁️ Google Cloud Services

> All covered by **Google Cloud credits**.

| Service | Purpose | Cost |
|---|---|---|
| **Cloud Run** | FastAPI backend (serverless) | ~$5–10/month |
| **Artifact Registry** | Docker image storage | Low cost |
| **Secret Manager** | Store API keys securely | Free tier |
| **Cloud Logging** | Agent trace logs | Free tier |

> No Firestore, BigQuery, or Cloud Tasks — JSON files only for this build.

---

## 🔍 Supported Languages

| Language | Example |
|---|---|
| **Roman Urdu** | `Mujhe kal subah G-13 mein AC technician chahiye` |
| **Urdu** | `مجھے کل صبح جی-13 میں اے سی ٹیکنیشن چاہیے` |
| **English** | `I need an AC technician in G-13 tomorrow morning` |
| **Mixed** | `Kal G-13 mein plumber chahiye, morning preferred` |

---

## 🔨 10 Service Categories

| # | Category | Example |
|---|---|---|
| 1 | AC Technician | `"AC theek karo G-13 mein kal"` |
| 2 | Plumber | `"Pipe leak fix karna hai aaj"` |
| 3 | Electrician | `"Bijli ka masla hai, electrician chahiye"` |
| 4 | Tutor | `"Maths tutor chahiye class 8 ke liye"` |
| 5 | Beautician | `"Beauty parlour home service chahiye"` |
| 6 | Carpenter | `"Furniture repair karna hai"` |
| 7 | Painter | `"Ghar paint karna hai, quote chahiye"` |
| 8 | Driver | `"Kal airport drop karna hai"` |
| 9 | Maid | `"Weekly cleaning service chahiye"` |
| 10 | Delivery Worker | `"Parcel deliver karna hai same day"` |

---

## 🤖 Agent Trace Log Format

Each agent step is logged to `logs/agent_trace_{session_id}.json` via `utils/logger.py`:

```json
{
  "session_id": "SES-001",
  "timestamp": "2026-05-18T08:00:00Z",
  "agent": "IntentAgent",
  "step": 1,
  "input": { "message": "Mujhe kal subah G-13 mein AC technician chahiye" },
  "output": {
    "service_type": "AC Technician",
    "location": "G-13",
    "time_iso": "2026-05-18T09:00:00",
    "language_detected": "Roman Urdu"
  },
  "mode": "gemini",
  "duration_ms": 410
}
```

---

## ⚠️ Known Issues & Decisions

| Issue | Decision |
|---|---|
| Gemini API quota `limit: 0` | Set `MOCK_INTENT=true` in `.env` — keyword parser activates automatically |
| Agent 3 filename | `confirmation.py` (renamed from `recommendation.py`) |
| Time format | ISO 8601 with T separator: `"2026-05-18T09:00:00"` — required by Sami's routes |
| Score format | Integer 0–100 (not float 0.0–1.0) |
| `providers.json` ownership | Sami only — Abdrehman reads but never commits |
| Maps API | Not used — haversine distance via `utils/maps.py` |

---

## 📋 Evaluation Criteria Mapping

| Criterion | Weight | How We Address It |
|---|---|---|
| Use of Google Antigravity | 25% | 4-agent pipeline in Agent Manager; GitHub + Cloud Run MCP |
| Agentic Reasoning & Workflow | 20% | 2-phase pipeline with per-session JSON trace logs |
| Matching Quality & Decision Logic | 20% | Composite score (distance + rating + availability) + reasoning text |
| Action Simulation & Execution | 15% | `bookings.json` write, `BK-YYYYMMDD-NNNNN` receipt, end-to-end flow |
| Technical Implementation | 10% | FastAPI + React Native, Cloud Run deploy, mock mode fallback |
| Innovation & UX | 10% | User-in-the-loop flow, multilingual, Urdu time normalisation |

---

## 📄 License

MIT — built for hackathon purposes.

---

## 🔗 Links

- Google Antigravity: https://antigravity.google
- Gemini API (free key): https://aistudio.google.com/apikey
- `google-genai` SDK: https://pypi.org/project/google-genai
- Cloud Run Docs: https://cloud.google.com/run/docs
- Expo Docs: https://docs.expo.dev
- Getting Started with Antigravity: https://codelabs.developers.google.com/getting-started-google-antigravity
