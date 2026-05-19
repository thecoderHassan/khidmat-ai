"""
Agent 4 — Booking Agent
Simulates a booking confirmation: assigns a booking ID, writes the
record to data/bookings.json, and returns a customer-facing receipt.
"""

import json
import time
from datetime import datetime, timezone
from pathlib import Path

from utils.logger import write_trace

BOOKINGS_FILE = Path(__file__).parent.parent / "data" / "bookings.json"


def _load_bookings() -> list[dict]:
    """Return the bookings list from Sami's {"bookings": [...]} file."""
    if not BOOKINGS_FILE.exists():
        return []
    with open(BOOKINGS_FILE, encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError:
            return []
    if isinstance(data, dict):
        return data.get("bookings", [])
    # tolerate a legacy bare-array file
    return data if isinstance(data, list) else []


def _save_bookings(bookings: list[dict]) -> None:
    """Persist bookings under Sami's {"bookings": [...]} schema."""
    with open(BOOKINGS_FILE, "w", encoding="utf-8") as f:
        json.dump({"bookings": bookings}, f, indent=2)


def _humanize_slot(slot: str | None) -> tuple[str | None, str]:
    """
    Return (date_text, time_text) for a slot string, e.g. ("18 May", "9:00 AM").
    date_text is None for legacy time-only slots that carry no date.
    """
    if not slot:
        return None, "the scheduled time"
    try:
        if "T" in slot:
            dt = datetime.fromisoformat(slot)
            return f"{dt.day} {dt.strftime('%B')}", dt.strftime("%I:%M %p").lstrip("0")
        hh, mm = slot.split(":")[:2]
        dt = datetime(2000, 1, 1, int(hh), int(mm))
        return None, dt.strftime("%I:%M %p").lstrip("0")
    except (ValueError, TypeError):
        return None, slot


def _booking_date(slot: str | None) -> str:
    """YYYYMMDD portion for the booking ID — the slot's date, else today's."""
    if slot and "T" in slot:
        try:
            return datetime.fromisoformat(slot).strftime("%Y%m%d")
        except ValueError:
            pass
    return datetime.now().strftime("%Y%m%d")


def run(input_data: dict) -> dict:
    """
    Entry point called by the Antigravity pipeline.

    Args:
        input_data: Agent 3 (Confirmation) output —
            {
                "provider": { ...full provider object... },
                "service_type": "AC Technician",
                "confirmed_slot": "2026-05-18T09:00:00",
                "session_id": "SES-001"
            }

    Returns:
        {
            "booking_id": "BK-20260518-00001",
            "provider_name": "Ali AC Services",
            "service_type": "AC Technician",
            "confirmed_slot": "2026-05-18T09:00:00",
            "provider_phone": "+92-300-0000001",
            "price_range": "PKR 500-1500",
            "receipt_text": "Booking confirmed! ...",
            "session_id": "SES-001"
        }
    """
    start = time.time()

    provider = input_data.get("provider")
    if not provider:
        raise ValueError("input_data must contain 'provider' (Confirmation Agent output)")

    confirmed_slot = input_data.get("confirmed_slot")
    service_type = input_data.get("service_type") or (
        provider.get("service_categories") or ["Service"]
    )[0]
    session_id = input_data.get("session_id", f"SES-{datetime.now().strftime('%Y%m%d-%H%M%S')}")

    provider_name = provider.get("name", "Provider")
    provider_phone = provider.get("phone", "N/A")
    price_range = provider.get("price_range", "N/A")
    area = provider.get("area", "your location")

    # Assign a booking ID: BK-<slot date>-<5-digit running sequence>
    bookings = _load_bookings()
    booking_id = f"BK-{_booking_date(confirmed_slot)}-{len(bookings) + 1:05d}"

    date_text, time_text = _humanize_slot(confirmed_slot)
    when = f"on {date_text} at {time_text}" if date_text else f"at {time_text}"
    receipt_text = (
        f"Booking confirmed! {provider_name} will arrive at {area} {when}. "
        f"Contact: {provider_phone}. Booking ID: {booking_id}."
    )

    record = {
        "booking_id": booking_id,
        "session_id": session_id,
        "provider_id": provider.get("id"),
        "provider_name": provider_name,
        "service_type": service_type,
        "confirmed_slot": confirmed_slot,
        "provider_phone": provider_phone,
        "price_range": price_range,
        "area": area,
        "booked_at": datetime.now(timezone.utc).isoformat(),
    }
    bookings.append(record)
    _save_bookings(bookings)

    duration_ms = int((time.time() - start) * 1000)

    write_trace({
        "session_id": session_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "agent": "BookingAgent",
        "step": 4,
        "input": {"provider_id": provider.get("id"), "confirmed_slot": confirmed_slot},
        "reasoning": (
            f"Confirmed booking {booking_id} with {provider_name} "
            f"for {service_type} {when}."
        ),
        "tools_used": ["bookings_json"],
        "output": {"booking_id": booking_id},
        "duration_ms": duration_ms,
    })

    return {
        "booking_id": booking_id,
        "provider_name": provider_name,
        "service_type": service_type,
        "confirmed_slot": confirmed_slot,
        "provider_phone": provider_phone,
        "price_range": price_range,
        "receipt_text": receipt_text,
        "session_id": session_id,
    }
def create_booking(intent: dict, provider: dict, slot: str, user_name: str, user_phone: str, session_id: str) -> dict:
    result = run({"provider": provider, "service_type": intent.get("service_type"), "confirmed_slot": slot, "session_id": session_id})
    receipt = {"booking_id": result["booking_id"], "service": result["service_type"], "provider": {"name": result["provider_name"], "phone": result["provider_phone"], "price_range": result["price_range"]}, "scheduled_for": slot, "customer": {"name": user_name, "phone": user_phone}}
    return {**result, "user_name": user_name, "user_phone": user_phone, "status": "confirmed", "receipt": receipt}
    