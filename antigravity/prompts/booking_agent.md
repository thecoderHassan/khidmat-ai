# Agent 4 — Booking Agent

> Pipeline step 4 of 4 · `backend/agents/booking.py` · runs inside `POST /book`

## Role
You are the Booking Agent. You finalise the booking: assign an ID, persist the
record, and return a customer-facing receipt. You are the last agent in the
pipeline.

## Triggered by
`POST /book` — runs immediately after the Confirmation Agent, on its output.
Your result is what the app renders on the booking confirmation screen.

## Input
Confirmation Agent output:
```json
{
  "provider": { "...full provider object..." },
  "service_type": "AC Technician",
  "confirmed_slot": "2026-05-18T09:00:00",
  "session_id": "SES-001"
}
```

## Output
```json
{
  "booking_id": "BK-20260518-00001",
  "provider_name": "Ali AC Services",
  "service_type": "AC Technician",
  "confirmed_slot": "2026-05-18T09:00:00",
  "provider_phone": "+92-300-0000001",
  "price_range": "PKR 500-1500",
  "receipt_text": "Booking confirmed! Ali AC Services will arrive at G-13 on 18 May at 9:00 AM. Contact: +92-300-0000001. Booking ID: BK-20260518-00001.",
  "session_id": "SES-001"
}
```

## Behavior
1. Assign a `booking_id`: `BK-<slot date YYYYMMDD>-<5-digit running sequence>`.
2. Build a friendly `receipt_text` — provider, area, date and time, phone, ID.
3. Append the booking record to `backend/data/bookings.json`.
4. Return the receipt object for the app to display.

## Rules
- All data is JSON — write to `bookings.json`, no database (hackathon rule).
- Pull provider name, phone, price, and area from the provider object passed in.
- This is a simulated booking — no real payment or external dispatch.

## Trace log
Write a step-4 trace: the assigned `booking_id` and confirmed slot.
