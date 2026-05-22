"""Quick test for the Intent Agent — run from backend/ directory."""

from agents.intent import run

test_messages = [
    "Mujhe kal subah G-13 mein AC technician chahiye",
    "I need a plumber in F-7 today evening",
    "مجھے آج بجلی کا مسئلہ ہے، الیکٹریشن چاہیے",
    "Kal G-11 mein painter chahiye, morning preferred",
]

for msg in test_messages:
    safe_msg = msg.encode("ascii", errors="replace").decode("ascii")
    print(f"\nInput:  {safe_msg}")
    result = run({"message": msg, "session_id": "TEST-001"})
    print(f"  service_type:      {result.get('service_type')}")
    print(f"  location:          {result.get('location')}")
    print(f"  time_preference:   {result.get('time_preference')}")
    print(f"  time_iso:          {result.get('time_iso')}")
    print(f"  language_detected: {result.get('language_detected')}")
    print("-" * 60)
