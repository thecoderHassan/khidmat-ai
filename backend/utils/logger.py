import json
from pathlib import Path

LOGS_DIR = Path(__file__).parent.parent.parent / "logs"


def write_trace(trace: dict) -> None:
    LOGS_DIR.mkdir(exist_ok=True)
    session_id = trace.get("session_id", "unknown")
    log_file = LOGS_DIR / f"agent_trace_{session_id}.json"

    traces = []
    if log_file.exists():
        with open(log_file) as f:
            try:
                traces = json.load(f)
            except json.JSONDecodeError:
                traces = []

    traces.append(trace)

    with open(log_file, "w") as f:
        json.dump(traces, f, indent=2)
