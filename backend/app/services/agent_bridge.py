"""Agent bridge — calls Abdul Rehman's 4 agents.

Strategy: try to import the real agents from the `agents/` package at the
repo root. If they're not available yet (he's still building), fall back
to deterministic stubs that match his locked output contract. This lets
the backend run end-to-end today and seamlessly switch to real agents
when his code lands.

Contracts (from Abdul Rehman's notes):

  Agent 1 (intent.py) — extract_intent(message, session_id) -> dict
    { service_type, location, time_preference, time_iso,
      language_detected, session_id }

  Agent 2 (discovery.py) — discover_and_rank(intent, providers,
                                              user_lat, user_lng) -> dict
    { top_match, alternatives, session_id }
    Each provider has score, distance_km, proximity_score, rating_score,
    availability_score attached. Formula: 0.40 prox + 0.40 rating + 0.20 avail.

  Agent 3 (confirmation.py) — confirm_booking(intent, provider, slot,
                                              session_id) -> dict
    { valid: bool, reasoning: str, provider, slot }

  Agent 4 (booking.py) — create_booking(intent, provider, slot, user,
                                        session_id) -> dict
    { booking_id, ...full booking record, receipt: {...} }
"""
from __future__ import annotations

import logging
import math
import secrets
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Try to load Abdul Rehman's real agents
# ─────────────────────────────────────────────────────────────────────────────

_real_intent = None
_real_discovery = None
_real_confirmation = None
_real_booking = None
_real_write_trace = None

try:
    from agents.intent import extract_intent as _real_intent  # type: ignore
    logger.info("✓ Loaded real agents.intent")
except Exception as e:
    logger.warning("agents.intent not available, using stub: %s", e)

try:
    from agents.discovery import discover_and_rank as _real_discovery  # type: ignore
    logger.info("✓ Loaded real agents.discovery")
except Exception as e:
    logger.warning("agents.discovery not available, using stub: %s", e)

try:
    from agents.confirmation import confirm_booking as _real_confirmation  # type: ignore
    logger.info("✓ Loaded real agents.confirmation")
except Exception as e:
    logger.warning("agents.confirmation not available, using stub: %s", e)

try:
    from agents.booking import create_booking as _real_booking  # type: ignore
    logger.info("✓ Loaded real agents.booking")
except Exception as e:
    logger.warning("agents.booking not available, using stub: %s", e)

try:
    from utils.logger import write_trace as _real_write_trace  # type: ignore
    logger.info("✓ Loaded real agents.utils.logger.write_trace")
except Exception as e:
    logger.warning("agents.utils.logger not available, using stub: %s", e)


# ─────────────────────────────────────────────────────────────────────────────
# Trace logging — used by stubs so /api/trace/{session_id} works even
# without Abdul Rehman's logger available.
# ─────────────────────────────────────────────────────────────────────────────

def write_trace(session_id: str, agent: str, step: str, **kwargs) -> None:
    """Write one trace entry. Delegates to Abdul Rehman's logger if present."""
    if _real_write_trace is not None:
        try:
            _real_write_trace(session_id, agent, step, **kwargs)
            return
        except Exception:
            logger.exception("Real write_trace failed, falling back to stub")

    # Stub: write to logs/agent_trace_{session_id}.json
    import json
    from pathlib import Path

    settings = get_settings()
    settings.trace_path.mkdir(parents=True, exist_ok=True)
    path = settings.trace_path / f"agent_trace_{session_id}.json"

    entry = {
        "agent": agent,
        "step": step,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        **kwargs,
    }

    try:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                steps = json.load(f)
            if not isinstance(steps, list):
                steps = []
        else:
            steps = []
        steps.append(entry)
        with path.open("w", encoding="utf-8") as f:
            json.dump(steps, f, indent=2, ensure_ascii=False)
    except OSError:
        logger.exception("Failed to write trace stub")


# ─────────────────────────────────────────────────────────────────────────────
# Geometry helper (matches utils/maps.haversine_km exactly)
# ─────────────────────────────────────────────────────────────────────────────

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 1 — Intent
# ─────────────────────────────────────────────────────────────────────────────

# Naive keyword map for stub mode — matches the categories Sami's providers.json uses
_SERVICE_KEYWORDS = {
    "AC Technician": ["ac", "air condition", "cooling", "ac repair", "ac technician"],
    "HVAC": ["hvac", "heating", "ventilation"],
    "Refrigerator Repair": ["fridge", "refrigerator", "freezer"],
    "Plumber": ["plumber", "leak", "pipe", "tap", "nal", "paani", "pani"],
    "Electrician": ["electrician", "bijli", "wire", "switch", "fuse", "electric"],
    "Barber": ["barber", "haircut", "naai", "nai", "shave"],
    "Pharmacy": ["pharmacy", "medicine", "dawa", "dawai", "medical store"],
    "Carpenter": ["carpenter", "barhai", "wood", "furniture"],
    "Tutor": ["tutor", "tuition", "teacher", "ustaad", "ustad"],
    "Generator Repair": ["generator", "genset"],
    "Pest Control": ["pest", "cockroach", "termite", "deemak", "rat"],
    "Water Tank Cleaning": ["tank", "water tank", "tanki"],
    "Car Mechanic": ["mechanic", "car", "gaari", "engine"],
}

_LANG_HINTS = {
    "ur": ["mujhe", "chahiye", "kal", "subah", "shaam", "raat", "ghar", "ka", "ki", "ko", "se"],
    "ro": ["kal", "subah", "abhi", "jaldi", "thik", "theek"],  # roman urdu
}


def _detect_language(text: str) -> str:
    t = text.lower()
    # quick check for urdu script
    if any("\u0600" <= ch <= "\u06ff" for ch in text):
        return "ur"
    if any(w in t.split() for w in _LANG_HINTS["ro"]):
        return "ro"
    return "en"


def _guess_service(text: str) -> str:
    t = text.lower()
    for service, kws in _SERVICE_KEYWORDS.items():
        if any(kw in t for kw in kws):
            return service
    return "General"


def _guess_time_iso(text: str) -> Optional[str]:
    """Very small natural-language time parser for the stub."""
    from datetime import timedelta

    t = text.lower()
    now = datetime.now(timezone.utc)

    if any(w in t for w in ["abhi", "now", "right now", "immediately", "urgent"]):
        return now.isoformat(timespec="seconds")
    if "kal" in t or "tomorrow" in t:
        target = now + timedelta(days=1)
        hour = 9
        if "shaam" in t or "evening" in t:
            hour = 18
        elif "raat" in t or "night" in t:
            hour = 21
        elif "dopahar" in t or "afternoon" in t:
            hour = 14
        return target.replace(hour=hour, minute=0, second=0, microsecond=0).isoformat(timespec="seconds")
    if "aaj" in t or "today" in t:
        hour = now.hour + 2
        if "shaam" in t or "evening" in t:
            hour = 18
        return now.replace(hour=min(hour, 22), minute=0, second=0, microsecond=0).isoformat(timespec="seconds")
    return None


def run_agent_1_intent(message: str, session_id: str) -> dict:
    """Agent 1 — extract intent from a free-form user message."""
    if _real_intent is not None:
        try:
            result = _real_intent(message, session_id)
            # tolerate dict-or-object return
            if hasattr(result, "model_dump"):
                result = result.model_dump()
            elif hasattr(result, "dict"):
                result = result.dict()
            return result
        except Exception:
            logger.exception("Real Agent 1 failed, falling back to stub")

    # Stub
    intent = {
        "service_type": _guess_service(message),
        "location": None,
        "time_preference": "soon",
        "time_iso": _guess_time_iso(message),
        "language_detected": _detect_language(message),
        "session_id": session_id,
    }
    write_trace(session_id, "agent_1_intent", "extract",
                input={"message": message}, output=intent,
                reasoning=f"Stub keyword match → {intent['service_type']}",
                tool_used="keyword_matcher_stub",
                tools_available=["gemini-2.0-flash", "keyword_matcher_stub"])
    return intent


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 2 — Discovery + Ranking
# ─────────────────────────────────────────────────────────────────────────────

# Islamabad sector centroid as a default user location when none is provided
_DEFAULT_USER_LAT = 33.6844
_DEFAULT_USER_LNG = 73.0479


def _score_provider(p: dict, user_lat: float, user_lng: float, max_km: float) -> dict:
    distance = _haversine_km(user_lat, user_lng, float(p["lat"]), float(p["lng"]))
    proximity = max(0.0, 1.0 - (distance / max_km)) if max_km > 0 else 0.0
    rating = float(p.get("rating", 0))
    rating_score = max(0.0, min(1.0, (rating - 1.0) / 4.0))
    availability_score = 1.0 if p.get("available") else 0.0
    final = 0.40 * proximity + 0.40 * rating_score + 0.20 * availability_score

    return {
        **p,
        "distance_km": round(distance, 2),
        "proximity_score": round(proximity, 3),
        "rating_score": round(rating_score, 3),
        "availability_score": availability_score,
        "score": round(final, 4),
        "reasoning": (
            f"{p['name']} is {round(distance, 1)} km away, "
            f"rated {rating}/5, "
            f"{'available' if p.get('available') else 'busy'}."
        ),
    }
def _normalize_score(raw_score) -> float:
    """Normalize a score to 0-1 range.

    Rehman's ranking.py returns 0-100. My stubs and Aqib's mobile both
    expect 0-1. If the value is already in 0-1 range, leave it alone
    (protects against double-normalization if his agent changes).
    """
    try:
        s = float(raw_score)
    except (TypeError, ValueError):
        return 0.0
    if s <= 1.0:
        return max(0.0, s)
    return min(1.0, s / 100.0)
def _enrich_discovery_result(
    result: dict,
    providers: list,
    user_lat: Optional[float],
    user_lng: Optional[float],
) -> dict:
    """Convert Rehman's thin card output into our full RankedProvider shape.

    His agent returns each provider as: {provider_id, name, distance_km,
    rating, matched_slot, score, price_range, phone, area}.
    Our model needs: id, full provider record, plus proximity_score,
    rating_score, availability_score.
    """
    by_id = {p["id"]: p for p in providers}

    def _enrich_one(card: Optional[dict]) -> Optional[dict]:
        if not card:
            return None
        pid = card.get("provider_id") or card.get("id")
        full = by_id.get(pid)
        if not full:
            # Card references a provider we don't know — return as-is, let
            # Pydantic complain. Should never happen if catalog is in sync.
            return card

        distance = float(card.get("distance_km", 0.0))
        # Reconstruct sub-scores from raw fields (formula: 0.40 prox + 0.40 rating + 0.20 avail)
        # His final score is authoritative; we recompute sub-scores for display only.
        rating = float(full.get("rating", 0))
        rating_score = max(0.0, min(1.0, (rating - 1.0) / 4.0))
        availability_score = 1.0 if full.get("available") else 0.0
        # proximity normalized roughly — for accurate value we'd need the full
        # candidate set, but distance_km is what Aqib's app displays anyway.
        proximity_score = max(0.0, 1.0 - (distance / 20.0))  # 20km = "far"

        return {
            **full,  # all locked fields (id, lat, lng, city, available_slots, etc.)
            "distance_km": round(distance, 2),
             "score": round(_normalize_score(card.get("score", 0.0)), 4),
            "proximity_score": round(proximity_score, 3),
            "rating_score": round(rating_score, 3),
            "availability_score": availability_score,
            "reasoning": card.get("reasoning") or (
                f"{full['name']} is {round(distance, 1)} km away, "
                f"rated {rating}/5, "
                f"{'available' if full.get('available') else 'busy'}."
            ),
            "matched_slot": card.get("matched_slot"),  # preserve Rehman's slot pick
        }

    return {
        "top_match": _enrich_one(result.get("top_match")),
        "alternatives": [
            _enrich_one(alt) for alt in (result.get("alternatives") or [])
            if alt is not None
        ],
        "session_id": result.get("session_id") or "",
        # Keep his extra fields too in case anything reads them
        **{k: v for k, v in result.items()
           if k not in {"top_match", "alternatives", "session_id"}},
    }

def run_agent_2_discovery(
    intent: dict,
    providers: list,
    user_lat: Optional[float],
    user_lng: Optional[float],
    session_id: str,
) -> dict:
    """Agent 2 — filter by service_type, score, return top_match + alternatives."""
    """Agent 2 — filter by service_type, score, return top_match + alternatives."""
    if _real_discovery is not None:
        try:
            result = _real_discovery(intent, providers, user_lat, user_lng)
            if hasattr(result, "model_dump"):
                result = result.model_dump()
            elif hasattr(result, "dict"):
                result = result.dict()
            # Adapter: Rehman's agent returns thin "cards" with `provider_id`
            # and ~8 display fields. Our Pydantic RankedProvider expects `id`
            # plus the full provider record + ranking scores. Enrich by
            # merging his scores onto the full provider from the catalog.
            result = _enrich_discovery_result(result, providers, user_lat, user_lng)
            return result
        except Exception:
            logger.exception("Real Agent 2 failed, falling back to stub")

    # Stub ranking — identical formula to Abdul Rehman's spec
    service_type = (intent.get("service_type") or "").strip()
    lat = user_lat if user_lat is not None else _DEFAULT_USER_LAT
    lng = user_lng if user_lng is not None else _DEFAULT_USER_LNG

    matching = [
        p for p in providers
        if any(
            service_type.lower() == str(c).lower() or service_type.lower() in str(c).lower()
            for c in (p.get("service_categories") or [])
        )
    ]

    if not matching:
        write_trace(session_id, "agent_2_discovery", "no_matches",
                    input={"service_type": service_type}, output={"count": 0},
                    tool_used="provider_catalog_filter")
        return {"top_match": None, "alternatives": [], "session_id": session_id}

    # Use max observed distance so proximity_score always normalizes 0..1
    raw_distances = [
        _haversine_km(lat, lng, float(p["lat"]), float(p["lng"])) for p in matching
    ]
    max_km = max(raw_distances) if raw_distances else 1.0
    if max_km <= 0:
        max_km = 1.0

    scored = [_score_provider(p, lat, lng, max_km) for p in matching]
    scored.sort(key=lambda x: x["score"], reverse=True)

    result = {
        "top_match": scored[0] if scored else None,
        "alternatives": scored[1:6],  # up to 5 alternatives
        "session_id": session_id,
    }
    write_trace(session_id, "agent_2_discovery", "rank",
                input={"service_type": service_type, "candidates": len(matching)},
                output={"top_id": result["top_match"]["id"] if result["top_match"] else None,
                        "alt_count": len(result["alternatives"])},
                reasoning="Weighted: 0.40 proximity + 0.40 rating + 0.20 availability",
                tool_used="haversine_distance",
                tools_available=["haversine_distance", "google_maps_distance_matrix"])
    return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 3 — Confirmation
# ─────────────────────────────────────────────────────────────────────────────

def run_agent_3_confirmation(
    intent: dict,
    provider: dict,
    slot: str,
    session_id: str,
) -> dict:
    """Agent 3 — validate slot, generate human-readable confirmation."""
    if _real_confirmation is not None:
        try:
            result = _real_confirmation(intent, provider, slot, session_id)
            if hasattr(result, "model_dump"):
                result = result.model_dump()
            elif hasattr(result, "dict"):
                result = result.dict()
            return result
        except Exception:
            logger.exception("Real Agent 3 failed, falling back to stub")

    slots = provider.get("available_slots") or []
    valid = slot in slots and provider.get("available", False)

    reasoning = (
        f"Slot {slot} is available with {provider['name']}."
        if valid else
        f"Slot {slot} is not currently bookable with {provider['name']}."
    )
    result = {
        "valid": valid,
        "reasoning": reasoning,
        "provider_id": provider.get("id"),
        "slot": slot,
        "session_id": session_id,
    }
    write_trace(session_id, "agent_3_confirmation", "validate",
                input={"provider_id": provider.get("id"), "slot": slot},
                output={"valid": valid}, reasoning=reasoning,
                tool_used="slot_availability_check")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 4 — Booking
# ─────────────────────────────────────────────────────────────────────────────

def _generate_booking_id() -> str:
    now = datetime.now(timezone.utc)
    return f"BK-{now.strftime('%Y%m%d')}-{secrets.token_hex(3)[:5].upper()}"

def _enrich_booking_result(
    result: dict,
    provider: dict,
    slot: str,
    user_name: str,
    user_phone: Optional[str],
    session_id: str,
) -> dict:
    """Convert Rehman's booking output to full Booking shape.

    Rehman returns: booking_id, provider_name, service_type, confirmed_slot,
    provider_phone, price_range, receipt_text, session_id.
    Sami's Booking model needs additionally: provider_id, slot, user_name,
    user_phone, status, created_at. Plus a structured receipt dict.
    """
    booking_id = result.get("booking_id") or _generate_booking_id()
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
    actual_slot = result.get("confirmed_slot") or slot

    booking = {
        "booking_id": booking_id,
        "session_id": result.get("session_id") or session_id,
        "provider_id": provider.get("id"),
        "provider_name": result.get("provider_name") or provider.get("name"),
        "provider_phone": result.get("provider_phone") or provider.get("phone"),
        "service_type": result.get("service_type"),
        "slot": actual_slot,
        "user_name": user_name,
        "user_phone": user_phone,
        "status": "confirmed",
        "created_at": now_iso,
    }
    receipt = {
        "booking_id": booking_id,
        "service": result.get("service_type"),
        "provider": {
            "name": result.get("provider_name") or provider.get("name"),
            "phone": result.get("provider_phone") or provider.get("phone"),
            "area": provider.get("area"),
            "rating": provider.get("rating"),
            "price_range": result.get("price_range") or provider.get("price_range"),
        },
        "scheduled_for": actual_slot,
        "issued_at": now_iso,
        "customer": {"name": user_name, "phone": user_phone},
        "receipt_text": result.get("receipt_text"),
    }
    return {**booking, "receipt": receipt}
    
def run_agent_4_booking(
    intent: dict,
    provider: dict,
    slot: str,
    user_name: str,
    user_phone: Optional[str],
    session_id: str,
) -> dict:
    """Agent 4 — persist booking, return record + receipt."""
    """Agent 4 — persist booking, return record + receipt."""
    if _real_booking is not None:
        try:
            result = _real_booking(intent, provider, slot, user_name, user_phone, session_id)
            if hasattr(result, "model_dump"):
                result = result.model_dump()
            elif hasattr(result, "dict"):
                result = result.dict()
            # Adapter: Rehman's booking.py returns slim record missing
            # provider_id, slot (renamed confirmed_slot), user_name,
            # user_phone, status, created_at. Enrich to full Booking shape.
            result = _enrich_booking_result(
                result, provider, slot, user_name, user_phone, session_id
            )
            return result
        except Exception:
            logger.exception("Real Agent 4 failed, falling back to stub")

    booking_id = _generate_booking_id()
    now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")

    booking = {
        "booking_id": booking_id,
        "session_id": session_id,
        "provider_id": provider.get("id"),
        "provider_name": provider.get("name"),
        "provider_phone": provider.get("phone"),
        "service_type": intent.get("service_type"),
        "slot": slot,
        "user_name": user_name,
        "user_phone": user_phone,
        "status": "confirmed",
        "created_at": now_iso,
    }
    receipt = {
        "booking_id": booking_id,
        "service": intent.get("service_type"),
        "provider": {
            "name": provider.get("name"),
            "phone": provider.get("phone"),
            "area": provider.get("area"),
            "rating": provider.get("rating"),
            "price_range": provider.get("price_range"),
        },
        "scheduled_for": slot,
        "issued_at": now_iso,
        "customer": {"name": user_name, "phone": user_phone},
    }
    write_trace(session_id, "agent_4_booking", "create",
                input={"provider_id": provider.get("id"), "slot": slot},
                output={"booking_id": booking_id},
                reasoning="Booking persisted to bookings.json",
                tool_used="json_file_writer",
                tools_available=["json_file_writer", "firestore_writer"])
    return {**booking, "receipt": receipt}


# ─────────────────────────────────────────────────────────────────────────────
# Convenience
# ─────────────────────────────────────────────────────────────────────────────

def new_session_id() -> str:
    return f"sess-{uuid.uuid4().hex[:12]}"


def agents_status() -> dict:
    """For /health — which agents are loaded vs stubbed."""
    return {
        "agent_1_intent": "real" if _real_intent else "stub",
        "agent_2_discovery": "real" if _real_discovery else "stub",
        "agent_3_confirmation": "real" if _real_confirmation else "stub",
        "agent_4_booking": "real" if _real_booking else "stub",
        "trace_logger": "real" if _real_write_trace else "stub",
    }
