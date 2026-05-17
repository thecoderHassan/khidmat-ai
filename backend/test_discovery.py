"""Quick test for the Discovery Agent — run from backend/ directory."""

from agents.discovery import run

tests = [
    {"service_type": "AC Technician",  "location": "G-13"},
    {"service_type": "Plumber",        "location": "G-11"},
    {"service_type": "Electrician",    "location": "F-10"},
    {"service_type": "Driver",         "location": "G-9"},
]

for t in tests:
    result = run({**t, "session_id": "TEST-002"})
    providers = result["providers"]
    print(f"\n[{t['service_type']} @ {t['location']}] -> {len(providers)} provider(s) found")
    for p in providers:
        print(f"  {p['name']:<30} dist={p['distance_km']} km  rating={p['rating']}  slots={p['available_slots']}")
