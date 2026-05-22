"""KhidmatAI backend — FastAPI entrypoint."""
from __future__ import annotations

import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import get_settings
from app.routers import agents, aliases, health,transcribe 
from app.services.bookings import get_booking_repo
from app.services.providers import get_provider_repo


def _configure_logging(level: str) -> None:
    """Single-format logging to stdout — Cloud Run captures stdout directly."""
    logging.basicConfig(
        level=level.upper(),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
        stream=sys.stdout,
        force=True,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup/shutdown."""
    settings = get_settings()
    _configure_logging(settings.log_level)
    log = logging.getLogger("khidmatai")

    log.info("Starting %s v%s (%s)",
             settings.app_name, settings.app_version, settings.environment)

    # Warm caches so the first request isn't slow
    repo = get_provider_repo()
    log.info("Provider catalog: %d entries", len(repo.all()))
    get_booking_repo()  # ensures bookings.json exists

    yield

    log.info("Shutting down %s", settings.app_name)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description=(
            "KhidmatAI — multi-agent home services booking for Pakistan. "
            "Phase 1: /api/request analyzes a user message and returns matched "
            "providers. Phase 2: /api/book confirms a slot and creates a "
            "booking. /api/trace/{session_id} returns the agent reasoning trace."
        ),
        lifespan=lifespan,
    )

    # CORS — Aqib's Expo app runs from many origins during dev
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request ID + timing middleware — helpful in Cloud Run logs
    @app.middleware("http")
    async def _request_context(request: Request, call_next):
        req_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logging.getLogger("khidmatai").exception(
                "Unhandled error req_id=%s path=%s", req_id, request.url.path
            )
            return JSONResponse(
                status_code=500,
                content={"error": "internal_error", "request_id": req_id},
            )
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        response.headers["x-request-id"] = req_id
        response.headers["x-response-time-ms"] = str(elapsed_ms)
        logging.getLogger("khidmatai").info(
            "%s %s -> %d (%dms) req_id=%s",
            request.method, request.url.path, response.status_code, elapsed_ms, req_id,
        )
        return response

    # Routers
    app.include_router(health.router)
    app.include_router(agents.router)
    app.include_router(aliases.router)
    app.include_router(transcribe.router)

    return app


app = create_app()
