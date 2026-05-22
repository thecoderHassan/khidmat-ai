"""
End-to-end test for the full 4-agent pipeline.
Phase 1 (/analyze): Intent -> Discovery
Phase 2 (/book):    Confirmation -> Booking
Run from the backend/ directory.
"""

from agents.intent import run as intent_run
from agents.discovery import run as discovery_run
from agents.confirmation import run as confirmation_run
from agents.booking import run as booking_run

MESSAGE = "Mujhe kal subah G-13 mein AC technician chahiye"

print("===== PHASE 1 - POST /analyze =====")
print(f"user message: {MESSAGE}")

intent = intent_run({"message": MESSAGE, "session_id": "E2E-001"})
print(f"\n[Agent 1 Intent]    service={intent['service_type']}  "
      f"location={intent['location']}  time_iso={intent['time_iso']}")

analyze = discovery_run(intent)
top = analyze["top_match"]
print(f"[Agent 2 Discovery] top_match={top['name']}  score={top['score']}  "
      f"+{len(analyze['alternatives'])} alternative(s)")

print("\n===== PHASE 2 - POST /book =====")
book_request = {
    "provider_id": top["provider_id"],
    "slot": top["matched_slot"],
    "service_type": analyze["service_type"],
    "session_id": intent["session_id"],
}
print(f"user tapped: {top['name']} @ {book_request['slot']}")

conf = confirmation_run(book_request)
print(f"\n[Agent 3 Confirmation] {conf['reasoning_text']}")

receipt = booking_run(conf)
print(f"[Agent 4 Booking]      {receipt['booking_id']}")
print(f"\n{receipt['receipt_text']}")
print("\n===== all 4 agents OK =====")
