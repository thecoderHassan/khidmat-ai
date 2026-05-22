"""Pydantic models for request/response schemas.

These define the public API contract. Field names match Abdul Rehman's
agent outputs exactly so we can pass dicts through without remapping.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ─────────────────────────────────────────────────────────────────────────────
# Provider
# ─────────────────────────────────────────────────────────────────────────────

class Provider(BaseModel):
    """A service provider from providers.json."""
    model_config = ConfigDict(extra="allow")  # tolerate extra fields from JSON

    id: str
    name: str
    service_categories: List[str]
    area: str
    city: str
    lat: float
    lng: float
    phone: str
    rating: float = Field(ge=0, le=5)
    experience_years: int = Field(ge=0)
    available: bool
    available_slots: List[str]  # ISO 8601 strings
    price_range: str


class RankedProvider(BaseModel):
    """Provider plus the ranking metadata Agent 2 attaches."""
    model_config = ConfigDict(extra="allow")

    id: str
    name: str
    service_categories: List[str]
    area: str
    city: str
    lat: float
    lng: float
    phone: str
    rating: float
    experience_years: int
    available: bool
    available_slots: List[str]
    price_range: str

    # ranking
    distance_km: float
    proximity_score: float
    rating_score: float
    availability_score: float
    score: float  # final 0.40*prox + 0.40*rating + 0.20*avail
    reasoning: Optional[str] = None


# ─────────────────────────────────────────────────────────────────────────────
# Phase 1 — Request analysis
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    """User message coming in from Aqib's mobile app."""
    message: str = Field(min_length=1, max_length=500)
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    user_area: Optional[str] = None  # fallback if no GPS
    session_id: Optional[str] = None  # client may provide, else server generates


class Intent(BaseModel):
    """Agent 1 output."""
    model_config = ConfigDict(extra="allow")

    service_type: str
    location: Optional[str] = None
    time_preference: Optional[str] = None
    time_iso: Optional[str] = None
    language_detected: str = "en"
    session_id: str


class AnalyzeResponse(BaseModel):
    """Phase 1 response — what Aqib renders on the results screen."""
    session_id: str
    intent: Intent
    top_match: Optional[RankedProvider] = None
    alternatives: List[RankedProvider] = Field(default_factory=list)
    trace_url: str  # convenience — points to /api/trace/{session_id}


# ─────────────────────────────────────────────────────────────────────────────
# Phase 2 — Booking
# ─────────────────────────────────────────────────────────────────────────────

class BookRequest(BaseModel):
    """User picked a provider and a slot."""
    session_id: str
    provider_id: str
    slot: str  # ISO 8601 datetime string
    user_name: Optional[str] = "Guest"
    user_phone: Optional[str] = None


class Booking(BaseModel):
    """A confirmed booking — also the shape stored in bookings.json."""
    booking_id: str  # BK-YYYYMMDD-XXXXX
    session_id: str
    provider_id: str
    provider_name: str
    provider_phone: str
    service_type: str
    slot: str
    user_name: str
    user_phone: Optional[str] = None
    status: str = "confirmed"
    created_at: str  # ISO 8601


class BookResponse(BaseModel):
    """Phase 2 response — what Aqib renders on the confirmation screen."""
    booking: Booking
    confirmation_message: str  # human-readable from Agent 3
    receipt: dict  # Agent 4's structured receipt
    trace_url: str


# ─────────────────────────────────────────────────────────────────────────────
# Follow-up
# ─────────────────────────────────────────────────────────────────────────────

class FollowupRequest(BaseModel):
    booking_id: str


class FollowupAction(BaseModel):
    action: str  # "reminder", "rate_service", "rebook", ...
    label: str
    payload: dict = Field(default_factory=dict)


class FollowupResponse(BaseModel):
    booking_id: str
    actions: List[FollowupAction]


# ─────────────────────────────────────────────────────────────────────────────
# Trace
# ─────────────────────────────────────────────────────────────────────────────

class TraceStep(BaseModel):
    model_config = ConfigDict(extra="allow")

    agent: str
    step:str | int
    timestamp: str
    input: Optional[dict] = None
    output: Optional[dict] = None
    reasoning: Optional[str] = None
    duration_ms: Optional[int] = None


class TraceResponse(BaseModel):
    session_id: str
    steps: List[TraceStep]


# ─────────────────────────────────────────────────────────────────────────────
# Errors
# ─────────────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
    session_id: Optional[str] = None
