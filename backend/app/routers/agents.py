"""Primary agentic flow — matches Abdul Rehman's locked contract.

POST /api/request → Agent 1 + Agent 2  → top_match + alternatives
POST /api/book    → Agent 3 + Agent 4  → booking + receipt
GET  /api/trace/{session_id}           → full agent trace
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    BookRequest,
    BookResponse,
    Booking,
    TraceResponse,
)
from app.services.agent_bridge import (
    new_session_id,
    run_agent_1_intent,
    run_agent_2_discovery,
    run_agent_3_confirmation,
    run_agent_4_booking,
)
from app.services.bookings import BookingRepository, get_booking_repo
from app.services.providers import ProviderRepository, get_provider_repo
from app.services.trace import read_trace, trace_url_for

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["agents"])


@router.post("/request", response_model=AnalyzeResponse)
async def request_service(
    payload: AnalyzeRequest,
    providers: ProviderRepository = Depends(get_provider_repo),
):
    """Phase 1: user sends a message, gets matched providers."""
    session_id = payload.session_id or new_session_id()
    logger.info("Phase 1 start: session=%s msg=%r", session_id, payload.message[:80])

    # Agent 1 — Intent
    try:
        intent = run_agent_1_intent(payload.message, session_id)
    except Exception:
        logger.exception("Agent 1 failed")
        raise HTTPException(status_code=500, detail="Intent extraction failed")

    # Agent 2 — Discovery
    try:
        discovery = run_agent_2_discovery(
            intent=intent,
            providers=providers.all(),
            user_lat=payload.user_lat,
            user_lng=payload.user_lng,
            session_id=session_id,
        )
    except Exception:
        logger.exception("Agent 2 failed")
        raise HTTPException(status_code=500, detail="Discovery failed")

    return AnalyzeResponse(
        session_id=session_id,
        intent=intent,
        top_match=discovery.get("top_match"),
        alternatives=discovery.get("alternatives") or [],
        trace_url=trace_url_for(session_id),
    )


@router.post("/book", response_model=BookResponse)
async def book_service(
    payload: BookRequest,
    providers: ProviderRepository = Depends(get_provider_repo),
    bookings: BookingRepository = Depends(get_booking_repo),
):
    """Phase 2: user picks a provider+slot, booking is confirmed."""
    logger.info("Phase 2 start: session=%s provider=%s slot=%s",
                payload.session_id, payload.provider_id, payload.slot)

    provider = providers.by_id(payload.provider_id)
    if provider is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Provider {payload.provider_id} not found",
        )

    # Reconstruct intent for Agent 3/4 — they need service_type at minimum.
    # The trace already has the original intent; here we read the first
    # service category as a safe default.
    intent = {
        "service_type": (provider.get("service_categories") or ["General"])[0],
        "session_id": payload.session_id,
    }

    # Agent 3 — Confirmation
    try:
        confirmation = run_agent_3_confirmation(
            intent=intent,
            provider=provider,
            slot=payload.slot,
            session_id=payload.session_id,
        )
    except Exception:
        logger.exception("Agent 3 failed")
        raise HTTPException(status_code=500, detail="Confirmation failed")

    if not confirmation.get("valid"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=confirmation.get("reasoning") or "Slot no longer available",
        )

    # Agent 4 — Booking
    try:
        result = run_agent_4_booking(
            intent=intent,
            provider=provider,
            slot=payload.slot,
            user_name=payload.user_name or "Guest",
            user_phone=payload.user_phone,
            session_id=payload.session_id,
        )
    except Exception:
        logger.exception("Agent 4 failed")
        raise HTTPException(status_code=500, detail="Booking failed")

    # Persist booking (idempotent — Agent 4 stub also produces this record)
    receipt = result.pop("receipt", {})
    booking_record = {k: v for k, v in result.items() if k != "receipt"}
    bookings.add(booking_record)

    return BookResponse(
        booking=Booking(**booking_record),
        confirmation_message=confirmation.get("reasoning") or "Booking confirmed.",
        receipt=receipt,
        trace_url=trace_url_for(payload.session_id),
    )


@router.get("/trace/{session_id}", response_model=TraceResponse)
async def get_trace(session_id: str):
    """Return the agent trace log for a session — for Aqib's trace screen."""
    steps = read_trace(session_id)
    if steps is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No trace found for session {session_id}",
        )
    return TraceResponse(session_id=session_id, steps=steps)


# ─────────────────────────────────────────────────────────────────────────────
# Booking status transitions — Challenge 2 Section 6 (follow-up automation)
#   confirmed → in_progress → completed
# Aqib can call these from the confirmation screen / follow-up screen.
# ─────────────────────────────────────────────────────────────────────────────

from pydantic import BaseModel, Field  # noqa: E402

_VALID_STATUSES = {"confirmed", "in_progress", "completed", "cancelled"}


class StatusUpdate(BaseModel):
    status: str = Field(description="One of: confirmed, in_progress, completed, cancelled")


@router.patch("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: str,
    payload: StatusUpdate,
    bookings: BookingRepository = Depends(get_booking_repo),
):
    """Transition a booking between lifecycle states."""
    if payload.status not in _VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {sorted(_VALID_STATUSES)}",
        )
    updated = bookings.update_status(booking_id, payload.status)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )
    return {"booking": updated, "message": f"Status updated to {payload.status}"}


@router.patch("/bookings/{booking_id}/complete")
async def complete_booking(
    booking_id: str,
    bookings: BookingRepository = Depends(get_booking_repo),
):
    """Convenience endpoint — mark a booking as completed."""
    updated = bookings.update_status(booking_id, "completed")
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )
    return {
        "booking": updated,
        "message": (
            f"✓ Booking {booking_id} marked complete. "
            f"Service by {updated.get('provider_name')} for "
            f"{updated.get('service_type')} delivered successfully."
        ),
    }


@router.get("/bookings/{booking_id}")
async def get_booking(
    booking_id: str,
    bookings: BookingRepository = Depends(get_booking_repo),
):
    """Look up a booking by ID — useful for Aqib's booking detail screen."""
    booking = bookings.get(booking_id)
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking {booking_id} not found",
        )
    return booking
