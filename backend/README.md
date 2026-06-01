# KhidmatAI — Backend

FastAPI backend powering an AI-assisted home services platform. The system processes user requests in Urdu, Roman Urdu, and English, matches suitable service providers, and manages booking workflows.

## Overview

KhidmatAI uses a modular multi-stage processing pipeline to:

* Understand service requests
* Discover relevant providers
* Rank suitable matches
* Confirm booking details
* Generate booking records and follow-up actions

The architecture is designed to support both deterministic and AI-powered implementations through interchangeable service modules.

## API Endpoints

| Method | Path           | Purpose                       |
| ------ | -------------- | ----------------------------- |
| GET    | `/`            | Service information           |
| GET    | `/health`      | Service health status         |
| GET    | `/docs`        | API documentation             |
| POST   | `/api/request` | Submit a service request      |
| POST   | `/api/book`    | Create a booking              |
| GET    | `/providers`   | Browse available providers    |
| POST   | `/followup`    | Retrieve post-booking actions |

## Running Locally

```bash
python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

cp .env.example .env

python scripts/build_providers.py

uvicorn app.main:app --reload --port 8080
```

Open:

http://localhost:8080/docs

## Testing

```bash
pytest tests/ -v
```

The test suite validates request processing, provider matching, booking workflows, and error handling.

## Docker

```bash
docker build -t khidmatai-backend .

docker run \
  --rm \
  -p 8080:8080 \
  --env-file .env \
  khidmatai-backend
```

## Project Structure

```text
khidmatai-backend/
├── app/
├── agents/
├── data/
├── logs/
├── scripts/
├── tests/
├── Dockerfile
├── requirements.txt
└── .env.example
```

## Configuration

Environment-specific behavior is controlled through environment variables defined in `.env`.

Examples include:

* AI provider configuration
* Development and mock modes
* CORS settings
* Logging configuration

## Deployment Notes

Before production deployment:

* Configure authentication and authorization.
* Restrict CORS origins.
* Apply rate limiting.
* Store logs and operational data in managed storage.
* Protect administrative and debugging endpoints.
* Use secret management services for credentials.

## License

Project-specific licensing information goes here.
