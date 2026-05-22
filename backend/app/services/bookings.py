"""Bookings storage layer.

For the hackathon, bookings live in a JSON file. Thread-safe append + read.
In production this would be Firestore or Postgres — interface is the same.
"""
from __future__ import annotations

import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


class BookingRepository:
    """JSON-backed booking store."""

    def __init__(self, path: Path):
        self._path = path
        self._lock = threading.RLock()
        self._ensure_file()

    def _ensure_file(self) -> None:
        """Create empty bookings.json if missing."""
        with self._lock:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            if not self._path.exists():
                self._write_all([])

    def _read_all(self) -> List[dict]:
        try:
            with self._path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict) and "bookings" in data:
                return data["bookings"]
            if isinstance(data, list):
                return data
            return []
        except (json.JSONDecodeError, OSError):
            logger.exception("Failed to read bookings file")
            return []

    def _write_all(self, bookings: List[dict]) -> None:
        tmp = self._path.with_suffix(".tmp")
        try:
            with tmp.open("w", encoding="utf-8") as f:
                json.dump({"bookings": bookings}, f, indent=2, ensure_ascii=False)
            tmp.replace(self._path)
        except OSError:
            logger.exception("Failed to write bookings file")
            if tmp.exists():
                tmp.unlink(missing_ok=True)
            raise

    def add(self, booking: dict) -> dict:
        """Append a booking. Returns the stored record."""
        with self._lock:
            bookings = self._read_all()
            bookings.append(booking)
            self._write_all(bookings)
            logger.info("Booking saved: %s", booking.get("booking_id"))
            return booking

    def get(self, booking_id: str) -> Optional[dict]:
        with self._lock:
            for b in self._read_all():
                if b.get("booking_id") == booking_id:
                    return b
        return None

    def all(self) -> List[dict]:
        with self._lock:
            return self._read_all()

    def for_provider(self, provider_id: str) -> List[dict]:
        return [b for b in self.all() if b.get("provider_id") == provider_id]

    def update_status(self, booking_id: str, new_status: str) -> Optional[dict]:
        """Update a booking's status. Returns the updated record, or None
        if booking not found. Records the transition in `status_history`.
        """
        with self._lock:
            bookings = self._read_all()
            for b in bookings:
                if b.get("booking_id") == booking_id:
                    old = b.get("status")
                    b["status"] = new_status
                    history = b.setdefault("status_history", [])
                    history.append({
                        "from": old,
                        "to": new_status,
                        "at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                    })
                    self._write_all(bookings)
                    logger.info("Booking %s: %s → %s", booking_id, old, new_status)
                    return b
        return None


def generate_booking_id(now: Optional[datetime] = None) -> str:
    """Booking ID format: BK-YYYYMMDD-XXXXX where XXXXX is a 5-char suffix."""
    import secrets

    now = now or datetime.now(timezone.utc)
    date_part = now.strftime("%Y%m%d")
    # 5-char alphanumeric, uppercase
    suffix = secrets.token_hex(3)[:5].upper()
    return f"BK-{date_part}-{suffix}"


# Singleton
_repo: Optional[BookingRepository] = None


def get_booking_repo() -> BookingRepository:
    global _repo
    if _repo is None:
        settings = get_settings()
        _repo = BookingRepository(settings.bookings_path)
    return _repo
