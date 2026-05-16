from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="KhidmatAI API",
    description="AI Service Orchestrator for Informal Economy",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"status": "KhidmatAI backend is running"}

@app.post("/api/request")
def handle_request(body: dict):
    """
    Main endpoint — accepts natural language service request.
    Runs through 4-agent Antigravity pipeline.
    TODO: wire up agents/intent.py → discovery.py → recommendation.py → booking.py
    """
    return {"message": "Agent pipeline not yet connected", "input": body}

@app.get("/api/providers")
def get_providers():
    """Return all mock providers from JSON."""
    # TODO: implement in agents/discovery.py
    return {"providers": []}

@app.get("/api/providers/{category}")
def get_providers_by_category(category: str):
    """Filter providers by service category."""
    # TODO: implement in agents/discovery.py
    return {"category": category, "providers": []}

@app.get("/api/booking/{booking_id}")
def get_booking(booking_id: str):
    """Get booking by ID from bookings.json."""
    # TODO: implement in agents/booking.py
    return {"booking_id": booking_id}

@app.get("/api/trace/{session_id}")
def get_trace(session_id: str):
    """Return agent trace log for a session."""
    # TODO: implement trace reader
    return {"session_id": session_id, "trace": []}
