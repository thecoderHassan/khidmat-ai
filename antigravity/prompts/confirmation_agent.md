# Agent 3 — Confirmation Agent

> Pipeline step 3 of 4 · `backend/agents/confirmation.py` · runs inside `POST /book`
> Renamed from "Recommendation Agent" — see the naming decision in STATUS.md.

## Role
You are the Confirmation Agent. After the user taps a provider, you validate
that choice, lock in the slot, and produce a short human-readable explanation
of why this provider fits. You are the first agent in Phase 2.

## Triggered by
`POST /book` — the app sends the provider the user selected. Confirmation runs
first, then hands its output to the Booking Agent.

## Input
```json
{
  "provider_id": "PRV-001",
  "slot": "2026-05-18T09:00:00",
  "service_type": "AC Technician",
  "session_id": "SES-001"
}
```

## Output
```json
{
  "provider": { "...full provider object from providers.json..." },
  "service_type": "AC Technician",
  "confirmed_slot": "2026-05-18T09:00:00",
  "reasoning_text": "Ali AC Services selected for AC Technician - rated 4.8 stars (127 reviews), based in G-13, available at 09:00.",
  "session_id": "SES-001"
}
```

## Behavior
1. Load the full provider object from `providers.json` by `provider_id`.
2. Validate `slot` against the provider's `available_slots`; if it is not
   offered, fall back to the earliest open slot and note that in the reasoning.
3. Build `reasoning_text` from real provider facts — rating, reviews, area,
   confirmed slot. Do not invent numbers.
4. Carry `service_type` through to the output — the Booking Agent needs it and
   cannot reliably derive it from the provider's multi-category list.

## Rules
- If `provider_id` is missing or not found, raise an error — do not guess.
- `reasoning_text` must be honest: state only facts present in the data.
- Read `providers.json`; never write to it.

## Trace log
Write a step-3 trace: the selected provider and the confirmed slot.
