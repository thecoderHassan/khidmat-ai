# KhidmatAI — Backend

FastAPI service that orchestrates 4 AI agents to power a Pakistani
home-services booking app. Phase 1 turns a user message (Urdu / Roman
Urdu / English) into matched providers; Phase 2 turns the user's pick
into a confirmed booking.

## Architecture

```
Phase 1 (user sends a message)
  POST /api/request → Agent 1 (Intent) → Agent 2 (Discovery + Rank)
                   → top_match + alternatives + trace_url

Phase 2 (user taps a provider)
  POST /api/book    → Agent 3 (Confirmation) → Agent 4 (Booking)
                   → booking + receipt + trace_url

Trace
  GET /api/trace/{session_id}
                   → full step-by-step agent reasoning log
```

## Endpoints

| Method | Path                          | Purpose                                          |
| ------ | ----------------------------- | ------------------------------------------------ |
| GET    | `/`                           | Service banner                                   |
| GET    | `/health`                     | Provider count + which agents are real vs stub   |
| GET    | `/docs`                       | Swagger UI                                       |
| POST   | `/api/request`                | **Phase 1** — message in, matches out           |
| POST   | `/api/book`                   | **Phase 2** — provider + slot in, booking out   |
| GET    | `/api/trace/{session_id}`     | Agent reasoning trace                            |
| POST   | `/analyze`                    | Alias of `/api/request`                          |
| POST   | `/book`                       | Alias of `/api/book`                             |
| GET    | `/providers`                  | List/filter the provider catalog                 |
| POST   | `/followup`                   | Post-booking action suggestions                  |

## Running locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # set GEMINI_API_KEY when available
python scripts/build_providers.py   # regenerate data/providers.json
uvicorn app.main:app --reload --port 8080
```

Then open <http://localhost:8080/docs>.

## Tests

```bash
pytest tests/ -v
```

Eleven tests cover the full booking flow, error cases, and trace retrieval.
They run against the agent stubs so no API keys are needed.

## Docker / Cloud Run

```bash
docker build -t khidmatai-backend .
docker run --rm -p 8080:8080 --env-file .env khidmatai-backend
```

For Cloud Run (Zeeshan):
```bash
gcloud run deploy khidmatai-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars MOCK_INTENT=true
```

## Agent integration (Abdul Rehman)

The `agents/` directory is the drop-in zone. The backend auto-detects
real agents at import time and falls back to deterministic stubs that
match the same contracts. See `agents/README.md` for the contract spec.

Hit `GET /health` to confirm which agents are loaded:
```json
{
  "agents": {
    "agent_1_intent": "real",
    "agent_2_discovery": "real",
    "agent_3_confirmation": "real",
    "agent_4_booking": "real",
    "trace_logger": "real"
  }
}
```

## Project layout

```
khidmatai-backend/
├── app/
│   ├── main.py              # FastAPI entrypoint + middleware
│   ├── config.py            # pydantic-settings env loader
│   ├── models/
│   │   └── schemas.py       # Request/response Pydantic models
│   ├── routers/
│   │   ├── agents.py        # /api/request, /api/book, /api/trace
│   │   ├── aliases.py       # /analyze, /providers, /book, /followup
│   │   └── health.py        # /, /health
│   └── services/
│       ├── agent_bridge.py  # Calls real agents or stubs
│       ├── providers.py     # providers.json loader
│       ├── bookings.py      # bookings.json writer
│       └── trace.py         # Trace log reader
├── agents/                  # Abdul Rehman's modules drop in here
├── data/
│   └── providers.json       # 25 Islamabad providers
├── logs/                    # agent_trace_{session_id}.json
├── scripts/
│   └── build_providers.py   # Regenerate providers.json
├── tests/
│   └── test_api.py
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Notes

- **Mock mode**: `MOCK_INTENT=true` keeps Agent 1 working without a Gemini key.
- **Trace logs** are filesystem-backed (`logs/agent_trace_*.json`). On Cloud
  Run they persist for the lifetime of the instance — fine for a hackathon
  demo. For production swap in Firestore.
- **Bookings** are stored in `data/bookings.json` with atomic writes.
- **CORS** is wide-open by default for Expo dev. Tighten via `CORS_ORIGINS`
  in production.
- The score formula is locked: `0.40·proximity + 0.40·rating + 0.20·availability`.
