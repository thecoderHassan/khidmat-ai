"""Quick test for the Discovery Agent — run from backend/ directory."""

from agents.discovery import run

tests = [
    {"service_type": "AC Technician", "location": "G-13"},
    {"service_type": "Plumber",       "location": "G-11"},
    {"service_type": "Electrician",   "location": "F-10"},
    {"service_type": "Driver",        "location": "G-9"},
]

for t in tests:
    result = run({**t, "session_id": "TEST-002", "time_iso": "2026-05-18T09:00:00"})
    top = result["top_match"]
    alts = result["alternatives"]
    print(f"\n[{t['service_type']} @ {t['location']}]")
    if top:
        print(f"  TOP  {top['name']:<28} score={top['score']:<4} "
              f"dist={top['distance_km']}km  rating={top['rating']}  slot={top['matched_slot']}")
    else:
        print("  no providers found")
    for a in alts:
        print(f"  alt  {a['name']:<28} score={a['score']:<4} "
              f"dist={a['distance_km']}km  rating={a['rating']}  slot={a['matched_slot']}")
