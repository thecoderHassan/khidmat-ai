"""Centralized configuration loaded from environment variables."""
from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "KhidmatAI"
    app_version: str = "1.0.0"
    environment: str = "development"
    log_level: str = "INFO"

    # AI / external APIs
    gemini_api_key: str = ""
    mock_intent: bool = True
    google_maps_api_key: str = ""
    use_google_maps: bool = False

    # CORS — permissive in dev so Expo on any LAN IP works
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])

    # File paths (resolved relative to project root)
    providers_file: str = "data/providers.json"
    bookings_file: str = "data/bookings.json"
    trace_dir: str = "logs"

    @property
    def providers_path(self) -> Path:
        return BASE_DIR / self.providers_file

    @property
    def bookings_path(self) -> Path:
        return BASE_DIR / self.bookings_file

    @property
    def trace_path(self) -> Path:
        return BASE_DIR / self.trace_dir


@lru_cache
def get_settings() -> Settings:
    """Cached settings — instantiate once per process."""
    return Settings()
