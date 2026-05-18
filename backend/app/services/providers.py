"""Provider data access layer.

Loads providers.json once at startup, caches in memory. The file is owned
by Sami (the schema) and read by Abdul Rehman's Agent 2.
"""
from __future__ import annotations

import json
import logging
import threading
from pathlib import Path
from typing import List, Optional

from app.config import get_settings

logger = logging.getLogger(__name__)


class ProviderRepository:
    """Thread-safe in-memory cache of providers.json."""

    def __init__(self, path: Path):
        self._path = path
        self._providers: List[dict] = []
        self._lock = threading.RLock()
        self._loaded = False

    def load(self) -> None:
        """Load providers from disk. Safe to call multiple times."""
        with self._lock:
            if not self._path.exists():
                logger.error("Providers file not found: %s", self._path)
                self._providers = []
                self._loaded = True
                return

            try:
                with self._path.open("r", encoding="utf-8") as f:
                    data = json.load(f)
            except (json.JSONDecodeError, OSError) as e:
                logger.exception("Failed to load providers.json: %s", e)
                self._providers = []
                self._loaded = True
                return

            # Schema: { "providers": [...] }
            if isinstance(data, dict) and "providers" in data:
                self._providers = data["providers"]
            elif isinstance(data, list):
                # tolerate flat-array variant
                self._providers = data
            else:
                logger.error("providers.json has unexpected shape")
                self._providers = []

            self._loaded = True
            logger.info("Loaded %d providers from %s", len(self._providers), self._path)

    def all(self) -> List[dict]:
        """Return all providers as a list of dicts."""
        if not self._loaded:
            self.load()
        with self._lock:
            return list(self._providers)

    def by_id(self, provider_id: str) -> Optional[dict]:
        """Look up one provider by id."""
        for p in self.all():
            if p.get("id") == provider_id:
                return p
        return None

    def by_service(self, service_type: str) -> List[dict]:
        """Filter providers whose service_categories contain service_type
        (case-insensitive match).
        """
        if not service_type:
            return []
        needle = service_type.strip().lower()
        out = []
        for p in self.all():
            cats = p.get("service_categories") or []
            if any(needle == str(c).lower() or needle in str(c).lower() for c in cats):
                out.append(p)
        return out

    def reload(self) -> None:
        """Force reload from disk — useful in dev."""
        with self._lock:
            self._loaded = False
        self.load()


# Singleton instance
_repo: Optional[ProviderRepository] = None


def get_provider_repo() -> ProviderRepository:
    """FastAPI dependency — returns the shared repo instance."""
    global _repo
    if _repo is None:
        settings = get_settings()
        _repo = ProviderRepository(settings.providers_path)
        _repo.load()
    return _repo
