"""Convenience aliases matching the assignment doc.

These mirror the names in the team assignment doc so Aqib can use either
naming convention without rewrites.

POST /analyze   → same as /api/request
GET  /providers → list/filter providers (no agent calls — debug + bonus)
POST /book      → same as /api/book
POST /followup  → returns post-booking actions (reminder / rate / rebook)
"""
from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models import (
    AnalyzeRequest,
    AnalyzeResponse,
    BookRequest,
    BookResponse,
    FollowupAction,
    FollowupRequest,
    FollowupResponse,
)
from app.routers.agents import book_service, request_service
from app.services.bookings import BookingRepository, get_booking_repo
from app.services.providers import ProviderRepository, get_provider_repo

logger = logging.getLogger(__name__)

router = APIRouter(tags=["aliases"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(
    payload: AnalyzeRequest,
    providers: ProviderRepository = Depends(get_provider_repo),
):
    """Alias of POST /api/request."""
    return await request_service(payload, providers)


@router.get("/providers", response_model=List[dict])
async def list_providers(
    service_type: Optional[str] = Query(None, description="Filter by service category"),
    city: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    available_only: bool = Query(False),
    providers: ProviderRepository = Depends(get_provider_repo),
):
    """List providers with simple filters.

    Useful for debugging, manual QA, and as a fallback if the mobile app
    wants to render a flat catalog.
    """
    result = providers.by_service(service_type) if service_type else providers.all()

    if city:
        c = city.strip().lower()
        result = [p for p in result if str(p.get("city", "")).lower() == c]
    if area:
        a = area.strip().lower()
        result = [p for p in result if a in str(p.get("area", "")).lower()]
    if available_only:
        result = [p for p in result if p.get("available")]

    return result


@router.post("/book", response_model=BookResponse)
async def book_alias(
    payload: BookRequest,
    providers: ProviderRepository = Depends(get_provider_repo),
    bookings: BookingRepository = Depends(get_booking_repo),
):
    """Alias of POST /api/book."""
    return await book_service(payload, providers, bookings)


@router.post("/followup", response_model=FollowupResponse)
async def followup(
    payload: FollowupRequest,
    bookings: BookingRepository = Depends(get_booking_repo),
):
    """Return suggested follow-up actions for a booking.

    Drives Aqib's post-booking screen: set a reminder, rate the service,
    or rebook with the same provider.
    """
    booking = bookings.get(payload.booking_id)
    if booking is None:
        raise HTTPException(status_code=404, detail=f"Booking {payload.booking_id} not found")

    actions = [
        FollowupAction(
            action="reminder",
            label="Remind me 1 hour before",
            payload={"booking_id": payload.booking_id, "minutes_before": 60},
        ),
        FollowupAction(
            action="rate_service",
            label=f"Rate {booking.get('provider_name', 'this service')}",
            payload={"booking_id": payload.booking_id, "provider_id": booking.get("provider_id")},
        ),
        FollowupAction(
            action="rebook",
            label="Book this provider again",
            payload={"provider_id": booking.get("provider_id")},
        ),
        FollowupAction(
            action="contact",
            label=f"Call {booking.get('provider_name', 'provider')}",
            payload={"phone": booking.get("provider_phone")},
        ),
    ]
    return FollowupResponse(booking_id=payload.booking_id, actions=actions)
