# 🤖 KhidmatAI — AI Service Orchestrator for Informal Economy

> **Hackathon Project** | Challenge 2: AI Service Orchestrator  
> Built with **Google Antigravity** · Powered by **Gemini 3 Pro** · Deployed on **Google Cloud**

---

## 📌 Overview

KhidmatAI is an agentic AI system that automates the end-to-end lifecycle of a home service request — from a natural language user message (in Urdu, Roman Urdu, or English) to provider matching, booking simulation, and follow-up reminders.

It targets Pakistan's **informal economy** — plumbers, electricians, AC technicians, tutors, beauticians — where most transactions happen through WhatsApp and phone calls, causing inefficiency, missed opportunities, and zero automation.

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

## 🏗️ System Architecture

```
User Input (Mobile App)
        │
        ▼
┌─────────────────────────────────────────────────┐
│              Google Antigravity                 │
│                Agent Manager                    │
│                                                 │
│  Agent 1: Intent Agent                          │
│  ├── NLP: extract service, location, time       │
│  └── Language detection (Urdu/Roman/English)    │
│                                                 │
│  Agent 2: Discovery Agent                       │
│  ├── Google Maps Places API (nearby providers)  │
│  └── Filter by service category + availability  │
│                                                 │
│  Agent 3: Recommendation Agent                  │
│  ├── Rank by distance × rating × availability  │
│  └── Generate plain-language justification      │
│                                                 │
│  Agent 4: Booking Agent                         │
│  ├── Simulate slot assignment                   │
│  ├── Write to Firestore (mock booking DB)       │
│  └── Generate confirmation receipt              │
│                                                 │
│  Agent 5: Follow-Up Agent                       │
│  ├── Schedule reminder (Cloud Tasks / FCM)      │
│  └── Send status + completion confirmation      │
└─────────────────────────────────────────────────┘
        │
        ▼
   Mobile App (Flutter)
   + Optional Web Dashboard
```

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Agent Orchestration** | Google Antigravity (Agent Manager) |
| **AI Models** | Gemini 3 Pro (primary), Claude Sonnet 4.6 (fallback) |
| **Backend** | Python (FastAPI) on Google Cloud Run |
| **Database** | Firebase Firestore (bookings), BigQuery (analytics logs) |
| **Maps & Location** | Google Maps Platform — Places API, Geocoding API |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Task Scheduling** | Google Cloud Tasks |
| **Mobile App** | Flutter (Android + iOS) |
| **Web App (optional)** | React + Firebase Hosting |
| **Agent Trace Logs** | Google Cloud Logging |
| **Auth** | Firebase Authentication |
| **Infrastructure** | Google Cloud (Cloud Run, Cloud Tasks, Firestore, BigQuery) |

---

## 🤖 How Google Antigravity Is Used

Antigravity is the **core orchestration platform** for this project. It is not just used for development — it is the runtime environment where agents execute.

### Agent Orchestration in Antigravity

The system uses Antigravity's **Agent Manager** to:

1. **Spawn agents** for each step in the pipeline (Intent → Discovery → Recommendation → Booking → Follow-Up)
2. **Pass context between agents** via shared memory and MCP tool calls
3. **Generate Artifacts** at each stage — a task plan, implementation result, and verification log
4. **Show traceable reasoning** through Antigravity's built-in artifact viewer

### MCP Integrations (inside Antigravity)

Antigravity connects to Google Cloud services via **MCP servers** installed through the Antigravity MCP Store:

| MCP Server | Used For |
|---|---|
| **Firebase MCP** | Firestore read/write (bookings), FCM notifications, Hosting deploy |
| **BigQuery MCP** | Append booking logs, query provider analytics |
| **Google Maps MCP** | Nearby provider search, distance calculation |
| **Cloud Run MCP** | Deploy and update the FastAPI backend |

### Antigravity Workflow Steps

```
[User sends message]
      │
      ▼ Antigravity Agent Manager spawns pipeline
      │
      ├─ Agent 1 (Intent Agent)
      │     Tool: Gemini 3 Pro NLP
      │     Artifact: { service, location, time, language }
      │
      ├─ Agent 2 (Discovery Agent)
      │     Tool: Google Maps Places API (via MCP)
      │     Artifact: [ { provider_id, name, distance, rating, available } ]
      │
      ├─ Agent 3 (Recommendation Agent)
      │     Tool: Ranking algorithm (distance × rating × availability)
      │     Artifact: { best_provider, score, reasoning_text }
      │
      ├─ Agent 4 (Booking Agent)
      │     Tool: Firebase Firestore MCP (write booking record)
      │     Artifact: { booking_id, confirmed_slot, receipt_text }
      │
      └─ Agent 5 (Follow-Up Agent)
            Tool: Cloud Tasks (schedule reminder), FCM (push notification)
            Artifact: { reminder_time, status_update_schedule }
```

---

## ☁️ Google Cloud Services Used (with Credits)

> All Google Cloud services below are billable and can be covered by your **Google Cloud credits**.

| Service | Purpose | Approx. Usage |
|---|---|---|
| **Cloud Run** | Host FastAPI backend (serverless, auto-scaling) | ~$5–10/month |
| **Firebase Firestore** | Store bookings, provider data, user sessions | Free tier / low cost |
| **Firebase Cloud Messaging** | Push notifications for booking + reminders | Free |
| **Firebase Hosting** | Host web dashboard | Free tier |
| **Firebase Authentication** | User login (phone/Google) | Free tier |
| **Google Maps Platform** | Places API (nearby search), Geocoding, Distance Matrix | ~$10–20/month |
| **BigQuery** | Store agent trace logs, booking analytics | Free 10GB/month |
| **Cloud Tasks** | Schedule follow-up reminders | Very low cost |
| **Cloud Logging** | Store agent decision logs and traces | Free tier |
| **Artifact Registry** | Store Docker images for Cloud Run | Low cost |
| **Secret Manager** | Store API keys securely | Free tier |

**Total estimated cost (hackathon scale): < $30/month**  
Google Cloud credits will fully cover this.

---

## 🗂️ Project Structure

```
khidmat-ai/
│
├── antigravity/
│   ├── agent_rules.md          # Agent behavior rules for Antigravity
│   ├── mcp_config.json         # MCP server config (Firebase, BigQuery, Maps)
│   └── prompts/
│       ├── intent_agent.md
│       ├── discovery_agent.md
│       ├── recommendation_agent.md
│       ├── booking_agent.md
│       └── followup_agent.md
│
├── backend/
│   ├── main.py                 # FastAPI app entry point
│   ├── agents/
│   │   ├── intent.py           # NLP + language detection
│   │   ├── discovery.py        # Google Maps Places API
│   │   ├── recommendation.py   # Ranking algorithm
│   │   ├── booking.py          # Firestore write + receipt generation
│   │   └── followup.py         # Cloud Tasks + FCM
│   ├── models/
│   │   ├── provider.py
│   │   ├── booking.py
│   │   └── trace_log.py
│   ├── data/
│   │   └── mock_providers.json # Mock provider dataset (50+ providers)
│   ├── Dockerfile
│   └── requirements.txt
│
├── mobile/                     # Flutter app
│   ├── lib/
│   │   ├── main.dart
│   │   ├── screens/
│   │   │   ├── chat_screen.dart
│   │   │   ├── agent_thinking_screen.dart
│   │   │   ├── provider_results_screen.dart
│   │   │   └── booking_confirmation_screen.dart
│   │   └── services/
│   │       ├── api_service.dart
│   │       └── fcm_service.dart
│   └── pubspec.yaml
│
├── web/                        # Optional React web dashboard
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── AgentTraceViewer.jsx
│   │   │   ├── ProviderMap.jsx
│   │   │   └── BookingLog.jsx
│   └── package.json
│
├── logs/
│   └── sample_agent_trace.json # Sample trace log for submission
│
├── docs/
│   └── architecture_diagram.png
│
├── .env.example
├── deploy.sh                   # One-click Cloud Run deploy script
└── README.md
```

---

## 📊 Mock Provider Dataset

Sample record in `mock_providers.json`:

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

---

## 🤖 Agent Trace Log Format

Each agent step produces a structured trace log stored in BigQuery and Cloud Logging:

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
  "tools_used": ["distance_matrix_api", "ranking_algorithm"],
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

- Google Antigravity installed (download at `antigravity.google/download`)
- Google Cloud project with billing enabled
- Google Cloud CLI (`gcloud`) installed and authenticated
- Flutter SDK installed
- Node.js 18+ and Python 3.11+

### Step 1 — Clone & Configure

```bash
git clone https://github.com/your-team/khidmat-ai.git
cd khidmat-ai
cp .env.example .env
# Fill in your Google Cloud Project ID, Maps API key, etc.
```

### Step 2 — Open in Antigravity

```bash
# Launch Antigravity and open the project folder
# In Agent Manager → Add Workspace → select /khidmat-ai
```

Then install MCP servers inside Antigravity:
- Agent pane → `...` menu → **MCP Servers**
- Install: **Firebase**, **BigQuery**, **Google Maps**

### Step 3 — Enable Google Cloud APIs

```bash
gcloud services enable \
  run.googleapis.com \
  maps-backend.googleapis.com \
  places-backend.googleapis.com \
  firestore.googleapis.com \
  cloudtasks.googleapis.com \
  bigquery.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com
```

### Step 4 — Deploy Backend to Cloud Run

```bash
chmod +x deploy.sh
./deploy.sh
# This builds the Docker image, pushes to Artifact Registry,
# and deploys to Cloud Run in your project region
```

### Step 5 — Run Flutter App

```bash
cd mobile
flutter pub get
flutter run
```

### Step 6 — Verify Agent Pipeline

Send a test request to your Cloud Run endpoint:

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

proximity_score  = 1 - (distance_km / max_distance_km)
rating_score     = (rating - 1) / 4        # normalized 1–5 → 0–1
availability_score = 1 if available else 0
```

The Recommendation Agent explains its decision in plain Urdu/English:
> *"Ali AC Services ko is liye select kiya gaya kyunke yeh sab se qareeb hai (2.1 km), rating bhi sab se zyada hai (4.8★), aur kal subah available bhi hai."*

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/request` | Submit a new service request |
| `GET` | `/api/booking/{id}` | Get booking details |
| `GET` | `/api/providers` | List all mock providers |
| `GET` | `/api/trace/{session_id}` | Get full agent trace log |
| `POST` | `/api/confirm/{booking_id}` | Confirm a pending booking |

---

## 📱 App Screens

| Screen | Description |
|---|---|
| **Chat Input** | User types or speaks their service request (Urdu/English) |
| **Agent Thinking** | Real-time display of which agent is running and what it's doing |
| **Provider Results** | Ranked list of providers with distance, rating, price, availability |
| **Provider Map** | Google Map showing provider pins with distance from user |
| **Booking Confirmation** | Receipt with provider name, slot, booking ID, and contact info |
| **Follow-Up Status** | Shows upcoming reminder and tracks booking status |

---

## 🔍 Supported Languages

| Language | Example Input |
|---|---|
| **Urdu** | `مجھے کل صبح جی-13 میں اے سی ٹیکنیشن چاہیے` |
| **Roman Urdu** | `Mujhe kal subah G-13 mein AC technician chahiye` |
| **English** | `I need an AC technician in G-13 tomorrow morning` |
| **Mixed** | `Kal G-13 mein plumber chahiye, morning preferred` |

Language detection uses Gemini 3 Pro's multilingual understanding. No separate translation step needed — the model extracts structured intent directly from any of these inputs.

---

## ⚠️ Assumptions & Limitations

- **Mock provider data**: 50+ providers across Islamabad sectors. Real deployment would require integration with a live provider registry.
- **Simulated booking**: No real money transactions. Booking confirmation updates Firestore; no actual provider notification in the hackathon demo.
- **Availability slots**: Pre-set in mock dataset; a production system would require real-time provider calendars.
- **Location scope**: Demo covers Islamabad/Rawalpindi. Easily extensible to other cities.
- **Reminders**: Cloud Tasks schedules the reminder job; FCM delivers it. In the demo, the reminder fires 5 minutes after booking (not 1 hour) to allow demo verification.
- **Antigravity preview**: Platform is in public preview; occasional instability is possible.

---

## 📋 Evaluation Criteria Mapping

| Criterion | Weight | How We Address It |
|---|---|---|
| Use of Google Antigravity | 25% | Core orchestration via Agent Manager; 5 agents; Firebase + BigQuery + Maps MCP |
| Agentic Reasoning & Workflow | 20% | Multi-step pipeline with traceable artifacts at each step |
| Matching Quality & Decision Logic | 20% | Composite score with distance/rating/availability + plain-language explanation |
| Action Simulation & Execution | 15% | Firestore write, receipt generation, FCM reminder, Cloud Tasks scheduling |
| Technical Implementation | 10% | Clean architecture, Cloud Run deploy, error handling for edge cases |
| Innovation & UX | 10% | Multilingual support, real-time agent thinking view, map integration |

---

## 👥 Team

| Name | Role |
|---|---|
| [Team Member 1] | Backend + Agent Architecture |
| [Team Member 2] | Mobile App (Flutter) |
| [Team Member 3] | Antigravity Orchestration + MCP Setup |
| [Team Member 4] | UI/UX + Demo Video |

---

## 📄 License

MIT License — built for hackathon purposes.

---

## 🔗 Links

- Google Antigravity: https://antigravity.google
- Google Antigravity Docs: https://antigravity.google/docs
- Firebase MCP Server: https://firebase.google.com/docs/ai-assistance/mcp-server
- Google Cloud Data Agent Kit for Antigravity: https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services
- Google Maps Platform: https://developers.google.com/maps
- Getting Started with Antigravity (Codelab): https://codelabs.developers.google.com/getting-started-google-antigravity
- Build and Deploy to GCP with Antigravity (Codelab): https://codelabs.developers.google.com/build-and-deploy-gcp-with-antigravity
