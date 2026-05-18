"""
Agent 2 — Discovery Agent
Filters providers.json by service type, computes distance from the
requested location, ranks the matches with utils.ranking, and returns a
`top_match` plus ranked `alternatives` for the app to display.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from utils.maps import get_area_coords, haversine_km
from utils.logger import write_trace

from agents.ranking import rank_providers

PROVIDERS_FILE = Path(__file__).parent.parent / "data" / "providers.json"

def _load_providers() -> list[dict]:
    """Return the provider list from Sami's {"providers": [...]} file."""
    with open(PROVIDERS_FILE, encoding="utf-8") as f:
        data = json.load(f)
    return data["providers"]


def _match_slot(slots: list[str], time_iso: str | None) -> str | None:
    """
    Pick the first slot at or after the requested time, else the earliest.

    Handles full ISO slots ("2026-05-18T09:00:00") and legacy time-only
    slots ("09:00") so discovery works before and after Sami's
    providers.json update.
    """
    if not slots:
        return None
    ordered = sorted(slots)
    if not time_iso:
        return ordered[0]
    if "T" not in ordered[0]:
        # legacy time-only slots — compare on the HH:MM portion only
        req = time_iso.split("T")[1][:5] if "T" in time_iso else time_iso[:5]
        return next((s for s in ordered if s >= req), ordered[0])
    return next((s for s in ordered if s >= time_iso), ordered[0])


def _to_card(provider: dict) -> dict:
    """Project a scored provider into the slim card the app renders.

    `provider_id` is sourced from Sami's `id` field; `area`/`lat`/`lng`
    are flat on the provider object.
    """
    return {
        "provider_id": provider.get("id"),
        "name": provider.get("name"),
        "area": provider.get("area"),
        "distance_km": provider.get("distance_km"),
        "rating": provider.get("rating"),
        "matched_slot": provider.get("matched_slot"),
        "score": provider.get("score"),
        "price_range": provider.get("price_range"),
        "phone": provider.get("phone"),
    }


def run(input_data: dict) -> dict:
    """
    Entry point called by the Antigravity pipeline.

    Args:
        input_data: Agent 1 (Intent) output —
            {
                "service_type": "AC Technician",
                "location": "G-13",
                "time_iso": "2026-05-18T09:00:00",
                "session_id": "SES-001"
            }

    Returns:
        {
            "top_match": { ...card with score... } | None,
            "alternatives": [ { ...card... }, ... ],
            "service_type": "AC Technician",
            "location": "G-13",
            "time_iso": "2026-05-18T09:00:00",
            "session_id": "SES-001"
        }
    """
    start = time.time()

    service_type = input_data.get("service_type", "")
    location = input_data.get("location", "")
    time_iso = input_data.get("time_iso")
    session_id = input_data.get("session_id", f"SES-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

    if not service_type:
        raise ValueError("input_data must contain 'service_type'")

    all_providers = _load_providers()

    # Step 1 — filter by service category and availability
    matched = []
    for p in all_providers:
        if service_type not in p.get("service_categories", []):
            continue
        if not p.get("available", False):
            continue
        p["matched_slot"] = _match_slot(p.get("available_slots", []), time_iso)
        matched.append(p)

    # Step 2 — attach distance_km
    origin = get_area_coords(location) if location else None
    for provider in matched:
        plat, plng = provider.get("lat"), provider.get("lng")
        if origin and plat is not None and plng is not None:
            provider["distance_km"] = haversine_km(origin[0], origin[1], plat, plng)
        else:
            # location unknown — large sentinel so it sorts/scores last
            provider["distance_km"] = 999.0

    # Step 3 — score and rank (best first)
    ranked = rank_providers(matched)
    cards = [_to_card(p) for p in ranked]
    top_match = cards[0] if cards else None
    alternatives = cards[1:]

    duration_ms = int((time.time() - start) * 1000)

    if top_match:
        reasoning = (
            f"Filtered {len(all_providers)} providers -> {len(matched)} available "
            f"{service_type} provider(s). Top match: {top_match['name']} "
            f"(score {top_match['score']}, {top_match['distance_km']}km)."
        )
    else:
        reasoning = (
            f"Filtered {len(all_providers)} providers -> no available "
            f"{service_type} providers found."
        )

    write_trace({
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": "DiscoveryAgent",
        "step": 2,
        "input": {"service_type": service_type, "location": location, "time_iso": time_iso},
        "reasoning": reasoning,
        "tools_used": ["providers_json", "haversine_distance", "ranking"],
        "output": {
            "providers_found": len(matched),
            "top_match": top_match["provider_id"] if top_match else None,
        },
        "duration_ms": duration_ms,
    })

    return {
        "top_match": top_match,
        "alternatives": alternatives,
        "service_type": service_type,
        "location": location,
        "time_iso": time_iso,
        "session_id": session_id,
    }
