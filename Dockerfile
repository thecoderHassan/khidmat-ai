# Multi-stage build for small final image
FROM python:3.11-slim AS builder

WORKDIR /build
ENV PIP_NO_CACHE_DIR=1 PYTHONDONTWRITEBYTECODE=1

# System deps only needed during install
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-warn-script-location -r requirements.txt

# ─── Runtime image ───────────────────────────────────────────────────────────
FROM python:3.11-slim

# Update system packages to patch OS-level security vulnerabilities
RUN apt-get update && apt-get upgrade -y && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/home/appuser/.local/bin:${PATH}" \
    PORT=8080 PYTHONPATH=/app

# Non-root user — Cloud Run best practice
RUN groupadd -r appuser && useradd -r -g appuser -u 1000 -m appuser

# Copy installed packages from builder
COPY --from=builder --chown=appuser:appuser /root/.local /home/appuser/.local

# Copy the folders from the backend directory to the container
COPY --chown=appuser:appuser backend/app ./backend/app/
COPY --chown=appuser:appuser backend/data ./backend/data/
COPY --chown=appuser:appuser backend/agents ./backend/agents/
COPY --chown=appuser:appuser backend/utils ./backend/utils/

# Copy the main execution file
COPY --chown=appuser:appuser backend/main.py ./backend/main.py

# Logs directory must be writable
RUN mkdir -p /app/backend/logs /app/backend/data && \
    chown -R appuser:appuser /app/backend/logs /app/backend/data

USER appuser

EXPOSE 8080

# Cloud Run sets $PORT (defaults to 8080). Use shell form so $PORT expands.
CMD ["sh", "-c", "exec uvicorn backend.main:app --host 0.0.0.0 --port \"${PORT:-8080}\" --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
