"""Quick test for the Intent Agent — run from backend/ directory."""

from agents.intent import run

test_messages = [
    "Mujhe kal subah G-13 mein AC technician chahiye",
    "I need a plumber in F-7 today evening",
    "مجھے آج بجلی کا مسئلہ ہے، الیکٹریشن چاہیے",
    "Kal G-11 mein painter chahiye, morning preferred",
]

for msg in test_messages:
    print(f"\nInput:  {msg}")
    result = run({"message": msg, "session_id": "TEST-001"})
    print(f"Output: {result}")
    print("-" * 60)
