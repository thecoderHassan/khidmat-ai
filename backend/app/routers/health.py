"""Health and debug endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.services.agent_bridge import agents_status
from app.services.providers import ProviderRepository, get_provider_repo

router = APIRouter(tags=["meta"])


@router.get("/")
async def root(settings: Settings = Depends(get_settings)):
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "ok",
        "docs": "/docs",
    }


@router.get("/health")
async def health(
    settings: Settings = Depends(get_settings),
    providers: ProviderRepository = Depends(get_provider_repo),
):
    return {
        "status": "ok",
        "environment": settings.environment,
        "providers_loaded": len(providers.all()),
        "agents": agents_status(),
        "mock_intent": settings.mock_intent,
    }
