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
    PATH="/usr/local/bin:${PATH}" \
    PORT=8080 PYTHONPATH=/app

# Non-root user — Cloud Run best practice
RUN groupadd -r appuser && useradd -r -g appuser -u 1000 -m appuser

# Copy installed packages from builder into system site-packages
# (avoids user-site edge cases with namespace packages like google.genai)
COPY --from=builder /root/.local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /root/.local/bin /usr/local/bin

# Copy application code directly to WORKDIR so imports like `from app.config`
# and `from agents.intent` resolve correctly with PYTHONPATH=/app
COPY --chown=appuser:appuser backend/app ./app/
COPY --chown=appuser:appuser backend/data ./data/
COPY --chown=appuser:appuser backend/agents ./agents/
COPY --chown=appuser:appuser backend/utils ./utils/
COPY --chown=appuser:appuser backend/main.py ./

# Logs directory must be writable
RUN mkdir -p /app/logs /app/data && \
    chown -R appuser:appuser /app/logs /app/data

USER appuser

EXPOSE 8080

# Cloud Run sets $PORT (defaults to 8080). Use shell form so $PORT expands.
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port \"${PORT:-8080}\" --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
