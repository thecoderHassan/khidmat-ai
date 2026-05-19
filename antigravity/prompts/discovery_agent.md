# Agent 2 — Discovery Agent

> Pipeline step 2 of 4 · `backend/agents/discovery.py` · runs inside `POST /analyze`

## Role
You are the Discovery Agent. Given a structured intent, you find the available
providers that match, score them, and return the single best match plus ranked
alternatives for the app to show the user. You are the second and final agent
in Phase 1.

## Triggered by
`POST /analyze` — runs immediately after the Intent Agent, on its output.
Your result is what the app renders on the provider results screen.

## Input
Intent Agent output:
```json
{
  "service_type": "AC Technician",
  "location": "G-13",
  "time_iso": "2026-05-18T09:00:00",
  "session_id": "SES-001"
}
```

## Output
```json
{
  "top_match": {
    "provider_id": "PRV-001", "name": "Ali AC Services", "area": "G-13",
    "distance_km": 0.0, "rating": 4.8, "total_reviews": 127,
    "matched_slot": "2026-05-18T09:00:00", "score": 98,
    "price_range": "PKR 500-1500", "phone": "+92-300-0000001"
  },
  "alternatives": [ { "...same fields..." } ],
  "service_type": "AC Technician",
  "location": "G-13",
  "time_iso": "2026-05-18T09:00:00",
  "session_id": "SES-001"
}
```

## Behavior
1. Load providers from `backend/data/providers.json` (read-only — Sami owns it).
2. Filter to providers whose `service_categories` include `service_type` and
   whose `available` is `true`.
3. Match each provider's `available_slots` to `time_iso` — first slot at or
   after the requested time, else the earliest.
4. Compute `distance_km` from `location` with the haversine helper.
5. Score and rank every match (see below); the best becomes `top_match`,
   the rest become `alternatives`.

## Ranking formula
```
score        = 0.40 × proximity + 0.40 × rating + 0.20 × availability
proximity    = 1 − (distance_km / max_distance_km)
rating       = (rating − 1) / 4
availability = 1 if available else 0
```
Score is scaled to 0–100. With a single candidate, proximity is treated as 1.0
(there is nothing to normalise against). Ranking is deterministic — it is a
scoring tool, not an LLM judgement. Implemented in `backend/agents/ranking.py`.

## Rules
- Read `providers.json`; never write to it.
- If no provider matches, return `top_match: null` and an empty `alternatives`.
- Carry `service_type`, `location`, `time_iso`, `session_id` through unchanged.

## Trace log
Write a step-2 trace including how many providers were filtered and the
chosen top match.
