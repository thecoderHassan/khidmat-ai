"""Trace log access.

Abdul Rehman's agents write to logs/agent_trace_{session_id}.json via
utils/logger.write_trace(). This module reads those files for the
/api/trace/{session_id} endpoint that Aqib's trace screen consumes.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import List, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)

# Defensive — never let a hostile session_id traverse the filesystem
_SAFE_SESSION_ID = re.compile(r"^[A-Za-z0-9_\-]{1,128}$")


def _trace_file(session_id: str) -> Optional[Path]:
    if not _SAFE_SESSION_ID.match(session_id):
        return None
    settings = get_settings()
    return settings.trace_path / f"agent_trace_{session_id}.json"


def read_trace(session_id: str) -> Optional[List[dict]]:
    """Return the list of trace steps for a session, or None if absent."""
    path = _trace_file(session_id)
    if path is None:
        logger.warning("Rejected unsafe session_id: %r", session_id)
        return None
    if not path.exists():
        return None

    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        logger.exception("Failed to read trace for %s", session_id)
        return None

    # Tolerate both shapes: a bare list of steps, or {"steps": [...]}.
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        if "steps" in data and isinstance(data["steps"], list):
            return data["steps"]
        # treat the dict itself as a single-step record
        return [data]
    return None


def trace_url_for(session_id: str) -> str:
    """Helper for embedding the trace path in responses."""
    return f"/api/trace/{session_id}"
