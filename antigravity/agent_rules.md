# Antigravity Agent Rules — KhidmatAI

## Project Context
KhidmatAI is a 4-agent AI service orchestrator for Pakistan's informal economy.
Stack: Python + FastAPI (backend) · React Native + Expo (mobile) · Gemini API · Google Maps API · Cloud Run.

## Agent Pipeline Order
1. Intent Agent          → backend/agents/intent.py
2. Discovery Agent       → backend/agents/discovery.py
3. Recommendation Agent  → backend/agents/recommendation.py
4. Booking Agent         → backend/agents/booking.py

## Rules for All Agents
- Always write trace logs: session_id, timestamp, agent name, step, input, reasoning, tools_used, output, duration_ms
- All data is JSON only — no database, no Firestore
- Provider data lives in backend/data/providers.json
- Booking data is written to backend/data/bookings.json
- Support 3 input languages: Urdu, Roman Urdu, English

## Coding Standards
- Python: type hints, docstrings, no hardcoded API keys (use os.getenv)
- JavaScript: functional components, async/await, no class components
- Every TODO comment must include "Author: [name]" and "Status:"

## What NOT to Change
- Do not add a database — JSON files only for this hackathon
- Do not add a 5th agent — pipeline is locked at 4
- Do not change the API endpoint paths in main.py
