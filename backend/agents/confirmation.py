"""
Agent 3 — Confirmation Agent
Validates the provider the user selected, locks in the slot, and
generates human-readable reasoning. Triggered by POST /book after the
user taps a provider in the app.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from utils.logger import write_trace

PROVIDERS_FILE = Path(__file__).parent.parent / "data" / "providers.json"


def _load_providers() -> list[dict]:
    with open(PROVIDERS_FILE, encoding="utf-8") as f:
        return json.load(f)


def _slot_time(slot: str | None) -> str:
    """Return the HH:MM portion of a slot string, for display."""
    if not slot:
        return "the requested time"
    return slot.split("T")[1][:5] if "T" in slot else slot[:5]


def run(input_data: dict) -> dict:
    """
    Entry point called by the pipeline.

    Args:
        input_data: {
            "provider_id": "PRV-001",
            "slot": "2026-05-18T09:00:00",
            "service_type": "AC Technician",
            "session_id": "SES-001",
            # optional, passed through from the discovery card:
            "distance_km": 0.0, "score": 94
        }

    Returns:
        {
            "provider": { ...full provider object from providers.json... },
            "service_type": "AC Technician",
            "confirmed_slot": "2026-05-18T09:00:00",
            "reasoning_text": "Ali AC Services selected ...",
            "session_id": "SES-001"
        }

    Note: `service_type` is carried through to the output because Agent 4
    (Booking) needs it and cannot reliably derive it from the provider's
    multi-category list.
    """
    start = time.time()

    provider_id = input_data.get("provider_id")
    slot = input_data.get("slot")
    service_type = input_data.get("service_type", "")
    session_id = input_data.get("session_id", f"SES-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

    if not provider_id:
        raise ValueError("input_data must contain 'provider_id'")

    provider = next(
        (p for p in _load_providers() if p.get("provider_id") == provider_id), None
    )
    if provider is None:
        raise ValueError(f"No provider found with provider_id '{provider_id}'")

    # Validate the requested slot against the provider's availability.
    slots = provider.get("available_slots", [])
    confirmed_slot = slot
    slot_note = ""
    if slots:
        if slot and slot in slots:
            confirmed_slot = slot
        else:
            # exact slot not offered (or none requested) — use the earliest open one
            confirmed_slot = sorted(slots)[0]
            if slot:
                slot_note = " (requested slot unavailable — earliest open slot used)"

    # Build reasoning text from what we know.
    name = provider.get("name", provider_id)
    rating = provider.get("rating")
    reviews = provider.get("total_reviews")
    area = provider.get("location", {}).get("area")
    distance_km = input_data.get("distance_km")   # optional, from discovery card

    details = []
    if distance_km is not None:
        details.append(f"{distance_km}km away")
    if rating is not None:
        rating_part = f"rated {rating} stars"
        if reviews:
            rating_part += f" ({reviews} reviews)"
        details.append(rating_part)
    if area:
        details.append(f"based in {area}")
    details.append(f"available at {_slot_time(confirmed_slot)}")

    reasoning_text = (
        f"{name} selected for {service_type or 'the service'} - "
        + ", ".join(details) + "." + slot_note
    )

    duration_ms = int((time.time() - start) * 1000)

    write_trace({
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": "ConfirmationAgent",
        "step": 3,
        "input": {"provider_id": provider_id, "slot": slot, "service_type": service_type},
        "reasoning": reasoning_text,
        "tools_used": ["providers_json"],
        "output": {"provider_id": provider_id, "confirmed_slot": confirmed_slot},
        "duration_ms": duration_ms,
    })

    return {
        "provider": provider,
        "service_type": service_type,
        "confirmed_slot": confirmed_slot,
        "reasoning_text": reasoning_text,
        "session_id": session_id,
    }
