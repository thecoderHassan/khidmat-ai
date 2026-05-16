# 🤖 KhidmatAI — AI Service Orchestrator for Informal Economy

> **Hackathon Project** | Challenge 2: AI Service Orchestrator  
> Built with **Google Antigravity** · Powered by **Gemini API** · Deployed on **Google Cloud Run**

---

## 📌 Overview

KhidmatAI is an agentic AI system that automates the end-to-end lifecycle of a home service request — from a natural language user message (in Urdu, Roman Urdu, or English) to provider matching, booking simulation, and follow-up reminders.

It targets Pakistan's **informal economy** across **10 service categories** — plumbers, electricians, AC technicians, tutors, beauticians, carpenters, painters, drivers, maids, and delivery workers — where most transactions happen through WhatsApp and phone calls, causing inefficiency, missed opportunities, and zero automation.

**Example input:**
```
"Mujhe kal subah G-13 mein AC technician chahiye"
```

**System output:**
```
Service:    AC Technician
Location:   G-13, Islamabad
Time:       Tomorrow, 10:00 AM
Provider:   Ali AC Services (2.1 km away, ⭐ 4.8)
Reasoning:  Closest available provider with highest rating in category
Booking:    Confirmed — Slot: 10:00 AM | ID: BK-2025-00142
Follow-up:  Reminder scheduled for 9:00 AM (1 hour before)
```

---

## ✅ Final Tech Stack (Locked)

| Item | Decision |
|---|---|
| **Mobile** | React Native + Expo |
| **Backend** | Python + FastAPI |
| **AI** | Gemini API |
| **Orchestration** | Antigravity — 4 agents |
| **Data** | JSON mock |
| **Maps** | Google Maps API |
| **Deployment** | Google Cloud Run |
| **Version Control** | GitHub |
| **Services** | 10 informal economy categories |
| **Database** | None — JSON only |
| **Language** | Python backend + JS mobile |

---

## 🏗️ System Architecture

```
User Input (React Native + Expo Mobile App)
        │
        ▼
┌─────────────────────────────────────────────────┐
│              Google Antigravity                 │
│                Agent Manager                    │
│                                                 │
│  Agent 1: Intent Agent                          │
│  ├── Gemini API: extract service, location, time│
│  └── Language detection (Urdu/Roman/English)    │
│                                                 │
│  Agent 2: Discovery Agent                       │
│  ├── Google Maps API (nearby providers)         │
│  └── Filter JSON mock by service + availability │
│                                                 │
│  Agent 3: Recommendation Agent                  │
│  ├── Rank by distance × rating × availability  │
│  └── Generate plain-language justification      │
│                                                 │
│  Agent 4: Booking Agent                         │
│  ├── Simulate slot assignment                   │
│  ├── Write confirmation to bookings.json        │
│  └── Generate booking receipt                   │
└─────────────────────────────────────────────────┘
        │
        ▼
   React Native App (Android + iOS via Expo)
```

---

## 🔧 Tech Stack Details

| Layer | Technology | Notes |
|---|---|---|
| **Agent Orchestration** | Google Antigravity — 4 agents | Core platform, mandatory |
| **AI Model** | Gemini API | NLP, intent parsing, multilingual |
| **Backend** | Python + FastAPI | REST API, deployed on Cloud Run |
| **Mobile App** | React Native + Expo | Android + iOS, JavaScript |
| **Data Storage** | JSON mock files | No database — JSON only |
| **Maps & Location** | Google Maps API | Nearby search, distance calculation |
| **Deployment** | Google Cloud Run | Serverless, auto-scaling |
| **Version Control** | GitHub | + GitHub MCP in Antigravity |
| **Service Categories** | 10 informal economy types | See full list below |
| **Languages** | Python (backend) + JavaScript (mobile) | |

---

## 🔨 10 Supported Service Categories

| # | Category | Example Request |
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

## 🤖 How Google Antigravity Is Used

Antigravity is the **core orchestration platform** — not just a dev tool. All 4 agents run through Antigravity's Agent Manager.

### 4-Agent Pipeline

```
[User sends message in app]
      │
      ▼ Antigravity Agent Manager spawns pipeline
      │
      ├─ Agent 1 — Intent Agent
      │     Tool: Gemini API (NLP + language detection)
      │     Output: { service_type, location, time, language }
      │
      ├─ Agent 2 — Discovery Agent
      │     Tool: Google Maps API + providers.json filter
      │     Output: [ { provider_id, name, distance, rating, available } ]
      │
      ├─ Agent 3 — Recommendation Agent
      │     Tool: Ranking algorithm (distance × rating × availability)
      │     Output: { best_provider, score, reasoning_text }
      │
      └─ Agent 4 — Booking Agent
            Tool: bookings.json write (mock booking system)
            Output: { booking_id, confirmed_slot, receipt_text }
```

### MCP Integrations (inside Antigravity)

| MCP Server | Used For |
|---|---|
| **GitHub MCP** | Push code, create branches, open PRs from prompts |
| **Google Maps MCP** | Nearby provider search, distance matrix |
| **Cloud Run MCP** | Deploy and update the FastAPI backend |

---

## ☁️ Google Cloud Services Used (with Credits)

> All billable services below are covered by **Google Cloud credits**.

| Service | Purpose | Approx. Cost |
|---|---|---|
| **Cloud Run** | Host FastAPI Python backend (serverless) | ~$5–10/month |
| **Google Maps Platform** | Places API, Distance Matrix, Geocoding | ~$10–20/month |
| **Artifact Registry** | Store Docker image for Cloud Run deploy | Low cost |
| **Secret Manager** | Secure API key storage (Gemini, Maps) | Free tier |
| **Cloud Logging** | Agent trace logs and decision logs | Free tier |

> **No Firestore, BigQuery, or Cloud Tasks** — all data is stored in JSON files for this hackathon build.

**Total estimated cost: < $20/month** — fully covered by Google Cloud credits.

---

## 🗂️ Project Structure

```
khidmat-ai/
│
├── antigravity/
│   ├── agent_rules.md              # Agent behavior rules for Antigravity
│   ├── mcp_config.json             # MCP config (GitHub, Maps, Cloud Run)
│   └── prompts/
│       ├── intent_agent.md
│       ├── discovery_agent.md
│       ├── recommendation_agent.md
│       └── booking_agent.md
│
├── backend/                        # Python + FastAPI
│   ├── main.py                     # FastAPI entry point
│   ├── agents/
│   │   ├── intent.py               # Gemini API — NLP + language detection
│   │   ├── discovery.py            # Google Maps API + JSON mock filter
│   │   ├── recommendation.py       # Ranking algorithm
│   │   └── booking.py              # JSON write + receipt generation
│   ├── data/
│   │   ├── providers.json          # Mock provider dataset (50+ providers)
│   │   └── bookings.json           # Simulated booking records (JSON only)
│   ├── Dockerfile
│   └── requirements.txt
│
├── mobile/                         # React Native + Expo
│   ├── App.js
│   ├── screens/
│   │   ├── ChatScreen.js           # User input (Urdu/English)
│   │   ├── AgentThinkingScreen.js  # Live agent step display
│   │   ├── ProviderResultsScreen.js
│   │   └── BookingConfirmScreen.js
│   ├── services/
│   │   └── api.js                  # FastAPI backend calls
│   ├── app.json
│   └── package.json
│
├── logs/
│   └── sample_agent_trace.json     # Sample trace log for submission
│
├── docs/
│   └── architecture_diagram.png
│
├── .env.example
├── deploy.sh                       # One-click Cloud Run deploy
└── README.md
```

---

## 📦 Mock Provider Dataset

All provider data lives in `backend/data/providers.json` — no database required.

Sample record:

```json
{
  "provider_id": "PRV-001",
  "name": "Ali AC Services",
  "service_categories": ["AC Technician", "HVAC", "Refrigerator Repair"],
  "location": {
    "area": "G-13",
    "city": "Islamabad",
    "lat": 33.6844,
    "lng": 73.0479
  },
  "rating": 4.8,
  "total_reviews": 127,
  "available": true,
  "available_slots": ["09:00", "10:00", "14:00", "16:00"],
  "price_range": "PKR 500–1500",
  "phone": "+92-300-0000001",
  "languages": ["Urdu", "English"]
}
```

Bookings are written to `backend/data/bookings.json` at runtime — no database needed.

---

## 🤖 Agent Trace Log Format

Each agent step produces a structured log saved to `logs/agent_trace.json`:

```json
{
  "session_id": "SES-20250515-001",
  "timestamp": "2025-05-15T10:23:45Z",
  "agent": "RecommendationAgent",
  "step": 3,
  "input": {
    "service": "AC Technician",
    "location": "G-13",
    "providers_found": 5
  },
  "reasoning": "Ranked 5 providers by composite score (distance 40%, rating 40%, availability 20%). Ali AC Services scored 0.91 — highest due to 2.1km proximity and 4.8★ rating with immediate availability.",
  "tools_used": ["google_maps_distance_matrix", "ranking_algorithm"],
  "output": {
    "selected_provider": "PRV-001",
    "score": 0.91,
    "reasoning_text": "Closest available provider with highest rating in AC Technician category"
  },
  "duration_ms": 312
}
```

---

## 🚀 Setup & Deployment

### Prerequisites

- Google Antigravity installed (`antigravity.google/download`)
- Google Cloud project with billing enabled + credits applied
- Google Cloud CLI (`gcloud`) installed and authenticated
- Node.js 18+ (for React Native + Expo)
- Python 3.11+
- Expo CLI: `npm install -g expo-cli`

### Step 1 — Clone & Configure

```bash
git clone https://github.com/your-team/khidmat-ai.git
cd khidmat-ai
cp .env.example .env
# Add: GEMINI_API_KEY, GOOGLE_MAPS_API_KEY, GCP_PROJECT_ID
```

### Step 2 — Open in Antigravity

```
Launch Antigravity → Agent Manager → Add Workspace → select /khidmat-ai
```

Install MCP servers inside Antigravity:
- Agent pane → `...` → **MCP Servers**
- Install: **GitHub MCP**, **Google Maps MCP**, **Cloud Run MCP**

### Step 3 — Enable Google Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  maps-backend.googleapis.com \
  places-backend.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 4 — Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload    # local development
```

### Step 5 — Deploy Backend to Cloud Run

```bash
chmod +x deploy.sh
./deploy.sh
# Builds Docker image → pushes to Artifact Registry → deploys to Cloud Run
```

### Step 6 — Run Mobile App

```bash
cd mobile
npm install
expo start
# Scan QR code with Expo Go app on your phone (Android or iOS)
```

### Step 7 — Verify Agent Pipeline

```bash
curl -X POST https://YOUR-CLOUD-RUN-URL/api/request \
  -H "Content-Type: application/json" \
  -d '{"message": "Mujhe kal subah G-13 mein AC technician chahiye"}'
```

---

## 🧠 Ranking Algorithm

Providers are ranked using a composite weighted score:

```
score = (0.40 × proximity_score)
      + (0.40 × rating_score)
      + (0.20 × availability_score)

proximity_score    = 1 - (distance_km / max_distance_km)
rating_score       = (rating - 1) / 4      # normalized 1–5 → 0–1
availability_score = 1 if available else 0
```

The Recommendation Agent explains its decision in plain Urdu/English:
> *"Ali AC Services ko is liye select kiya gaya kyunke yeh sab se qareeb hai (2.1 km), rating bhi sab se zyada hai (4.8★), aur kal subah available bhi hai."*

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/request` | Submit a service request (natural language) |
| `GET` | `/api/booking/{id}` | Get booking details from JSON |
| `GET` | `/api/providers` | List all mock providers |
| `GET` | `/api/providers/{category}` | Filter providers by service category |
| `GET` | `/api/trace/{session_id}` | Get full agent trace log |

---

## 📱 App Screens (React Native + Expo)

| Screen | Description |
|---|---|
| **Chat Input** | User types service request in Urdu/Roman Urdu/English |
| **Agent Thinking** | Real-time display of which agent is running and its reasoning |
| **Provider Results** | Ranked list with distance, rating, price, availability |
| **Provider Map** | Google Map with provider pins and distances |
| **Booking Confirmation** | Receipt with provider name, slot, booking ID, contact |

---

## 🔍 Supported Languages

| Language | Example Input |
|---|---|
| **Urdu** | `مجھے کل صبح جی-13 میں اے سی ٹیکنیشن چاہیے` |
| **Roman Urdu** | `Mujhe kal subah G-13 mein AC technician chahiye` |
| **English** | `I need an AC technician in G-13 tomorrow morning` |
| **Mixed** | `Kal G-13 mein plumber chahiye, morning preferred` |

Language detection uses Gemini API's multilingual understanding — no separate translation step needed.

---

## ⚠️ Assumptions & Limitations

- **No database**: All data stored in JSON files. No Firestore, BigQuery, or SQL.
- **Mock provider data**: 50+ providers across 10 service categories in Islamabad sectors. Real deployment would use a live registry.
- **Simulated booking**: No real money or SMS. Booking writes to `bookings.json` and returns a receipt.
- **Availability slots**: Pre-set in mock JSON; a production system would use real-time provider calendars.
- **Location scope**: Demo covers Islamabad/Rawalpindi. Extendable to any city by updating `providers.json`.
- **4 agents**: Intent → Discovery → Recommendation → Booking. Follow-up reminders are included in the booking receipt; no background scheduler in this build.
- **Antigravity**: Platform is in public preview; occasional instability is possible.

---

## 📋 Evaluation Criteria Mapping

| Criterion | Weight | How We Address It |
|---|---|---|
| Use of Google Antigravity | 25% | 4-agent pipeline in Agent Manager; GitHub + Maps + Cloud Run MCP |
| Agentic Reasoning & Workflow | 20% | Full planning → decision → action pipeline with traceable JSON logs |
| Matching Quality & Decision Logic | 20% | Composite score (distance + rating + availability) with Urdu/English explanation |
| Action Simulation & Execution | 15% | JSON write booking, receipt generation, end-to-end confirmation |
| Technical Implementation | 10% | Clean Python + FastAPI + React Native architecture, Cloud Run deploy |
| Innovation & UX | 10% | Multilingual Urdu/English, real-time agent thinking screen, 10 service categories |

---

## 👥 Team

| Name | Role |
|---|---|
| [Team Member 1] | Python + FastAPI backend + 4 agent logic |
| [Team Member 2] | React Native + Expo mobile app |
| [Team Member 3] | Antigravity orchestration + MCP setup |
| [Team Member 4] | UI/UX + demo video + JSON mock data |

---

## 📄 License

MIT License — built for hackathon purposes.

---

## 🔗 Links

- Google Antigravity: https://antigravity.google
- Google Antigravity Docs: https://antigravity.google/docs
- Gemini API Docs: https://ai.google.dev/gemini-api/docs
- Google Maps Platform: https://developers.google.com/maps
- GitHub MCP Server: https://github.com/github/github-mcp-server
- Cloud Run Docs: https://cloud.google.com/run/docs
- Getting Started with Antigravity (Codelab): https://codelabs.developers.google.com/getting-started-google-antigravity
- Build and Deploy to GCP with Antigravity (Codelab): https://codelabs.developers.google.com/build-and-deploy-gcp-with-antigravity
