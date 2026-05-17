"""
Agent 2 — Discovery Agent
Filters providers.json by service type and computes distance from requested location.
Returns all matching available providers with distance attached.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from utils.maps import get_area_coords, haversine_km
from utils.logger import write_trace

PROVIDERS_FILE = Path(__file__).parent.parent / "data" / "providers.json"


def _load_providers() -> list[dict]:
    with open(PROVIDERS_FILE, encoding="utf-8") as f:
        return json.load(f)


def run(input_data: dict) -> dict:
    """
    Entry point called by the Antigravity pipeline.

    Args:
        input_data: {
            "service_type": "AC Technician",
            "location": "G-13",
            "time_preference": "Tomorrow morning",
            "session_id": "SES-001"
        }

    Returns:
        {
            "providers": [ { ...provider fields..., "distance_km": 2.1 } ],
            "service_type": "AC Technician",
            "location": "G-13",
            "session_id": "SES-001"
        }
    """
    start = time.time()

    service_type = input_data.get("service_type", "")
    location = input_data.get("location", "")
    time_iso = input_data.get("time_iso")          # e.g. "2026-05-18 09:00"
    session_id = input_data.get("session_id", f"SES-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

    if not service_type:
        raise ValueError("input_data must contain 'service_type'")

    all_providers = _load_providers()

    # Step 1 — filter by service category and availability
    service_lower = service_type.lower()
    requested_hour = time_iso[11:16] if time_iso else None  # "HH:MM"

    matched = []
    for p in all_providers:
        if not any(cat.lower() == service_lower for cat in p.get("service_categories", [])):
            continue
        if not p.get("available", False):
            continue
        # If we have a requested time, keep only providers with a slot at or after it
        if requested_hour:
            slots = p.get("available_slots", [])
            p["matched_slot"] = next((s for s in slots if s >= requested_hour), slots[0] if slots else None)
        else:
            slots = p.get("available_slots", [])
            p["matched_slot"] = slots[0] if slots else None
        matched.append(p)

    # Step 2 — attach distance_km
    origin = get_area_coords(location)

    for provider in matched:
        loc = provider.get("location", {})
        plat, plng = loc.get("lat"), loc.get("lng")
        if origin and plat and plng:
            provider["distance_km"] = haversine_km(origin[0], origin[1], plat, plng)
        else:
            # location unknown — use large sentinel so it sorts last
            provider["distance_km"] = 999.0

    # Step 3 — sort by distance so the list is ordered (Recommendation Agent re-ranks with score)
    matched.sort(key=lambda p: p["distance_km"])

    duration_ms = int((time.time() - start) * 1000)

    write_trace({
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": "DiscoveryAgent",
        "step": 2,
        "input": {"service_type": service_type, "location": location},
        "reasoning": (
            f"Filtered {len(all_providers)} providers → {len(matched)} available "
            f"{service_type} providers. "
            + (f"Distances computed from {location}." if origin else f"Location '{location}' not in lookup — sorted by proximity to provider area.")
        ),
        "tools_used": ["providers_json", "haversine_distance"],
        "output": {"providers_found": len(matched)},
        "duration_ms": duration_ms,
    })

    return {
        "providers": matched,
        "service_type": service_type,
        "location": location,
        "time_iso": time_iso,
        "session_id": session_id,
    }
