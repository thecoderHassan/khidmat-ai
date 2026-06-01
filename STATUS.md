# KhidmatAI — System Overview

**Last Updated:** 2026-05-17

---

## 1. System Description

KhidmatAI is a backend service that processes natural language service requests and returns matched service providers, followed by a booking workflow after user confirmation.

The system supports multilingual input including Urdu, Roman Urdu, and English.

---

## 2. High-Level Flow

### Phase 1 — Service Matching

User submits a request:

* System interprets intent
* Identifies relevant service category
* Returns ranked provider options

### Phase 2 — Booking

User selects a provider:

* System confirms availability
* Generates booking record
* Returns confirmation details

---

## 3. API Surface

| Endpoint     | Purpose                                          |
| ------------ | ------------------------------------------------ |
| `/analyze`   | Process user request and return provider matches |
| `/book`      | Confirm booking for selected provider            |
| `/providers` | Retrieve available service providers             |
| `/followup`  | Post-booking actions                             |
| `/health`    | Service status check                             |

---

## 4. System Components

The backend is organized into modular components:

* Request processing layer
* Provider matching module
* Booking management module
* Utility functions for time and location processing
* Logging and trace capture for debugging

---

## 5. Configuration

System behavior is controlled via environment variables:

* AI provider configuration
* Development / mock mode toggles
* Logging configuration
* CORS policy settings

Sensitive values are not stored in source code.

---

## 6. Data Handling

* Provider data is stored in a structured dataset
* Booking data is stored per transaction
* Trace logs are generated per session for debugging purposes

Trace data is intended for internal diagnostics only.

---

## 7. Deployment

The service is designed for containerized deployment and supports cloud execution environments.

Development setup uses local execution with optional mock mode for testing without external AI dependencies.

---

## 8. Security Considerations

The system includes basic safeguards such as input validation and controlled session identifiers.

Production deployment must include:

* Authentication and authorization
* Rate limiting
* Restricted trace access
* Controlled CORS configuration
* Secure secret management

---

## 9. Notes

This system is designed for modular expansion, allowing replacement of internal components without affecting external API contracts.
