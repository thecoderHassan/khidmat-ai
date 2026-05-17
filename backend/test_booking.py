"""
End-to-end test for Phase 2 — Confirmation Agent (3) + Booking Agent (4).
Run from the backend/ directory.
"""

from agents.confirmation import run as confirmation_run
from agents.booking import run as booking_run

# Simulates the POST /book body the app sends after the user taps a provider.
book_request = {
    "provider_id": "PRV-001",
    "slot": "09:00",
    "service_type": "AC Technician",
    "session_id": "TEST-BOOK-001",
}

print("=== Agent 3 - Confirmation ===")
conf = confirmation_run(book_request)
print("confirmed_slot:", conf["confirmed_slot"])
print("reasoning_text:", conf["reasoning_text"])

print("\n=== Agent 4 - Booking ===")
receipt = booking_run(conf)
for key, value in receipt.items():
    print(f"  {key}: {value}")
