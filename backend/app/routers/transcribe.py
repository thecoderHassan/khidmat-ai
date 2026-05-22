"""
POST /api/transcribe
Accepts an audio file (m4a / wav / webm) from the KhidmatAI mobile app,
sends it to Gemini 2.5 Flash for transcription, and returns the text.

No extra STT API key needed — uses the same GEMINI_API_KEY already in .env
"""
from __future__ import annotations

import logging
import os
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["transcribe"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Supported MIME types from expo-av recordings
_MIME_MAP = {
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".ogg": "audio/ogg",
    ".mp3": "audio/mpeg",
    ".aac": "audio/aac",
}

_TRANSCRIBE_PROMPT = """You are the transcription engine for KhidmatAI, a Pakistani home services app. Transcribe the audio exactly as spoken. Do not translate, summarize, or comment.

### Examples:
- Audio: "Plumber ko bhej dein, tap leak ho raha hai."
  Output: Plumber ko bhej dein, tap leak ho raha hai.
  
- Audio: "میرا گیزر کام نہیں کر رہا، الیکٹریشن چاہیے"
  Output: میرا گیزر کام نہیں کر رہا، الیکٹریشن چاہیے
  
- Audio: "Can you send someone for sofa cleaning tomorrow morning at 10 AM?"
  Output: Can you send someone for sofa cleaning tomorrow morning at 10 AM?

- Audio: "Bhai AC service کی کتنی fees ہے؟"
  Output: Bhai AC service کی کتنی fees ہے؟

### Strict Rule:
Provide ONLY the raw transcription text matching the format of the outputs above. Absolutely no conversational filler, introductions, or explanations."""


class TranscribeResponse(BaseModel):
    text: str
    language_hint: str = "auto"


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(audio: UploadFile = File(...)):
    """
    Accepts a multipart audio file from the mobile app.
    Uses Gemini 2.5 Flash to convert speech to text.
    """
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY not configured on server.",
        )

    # Detect MIME type from filename extension
    filename = audio.filename or "recording.m4a"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ".m4a"
    mime_type = _MIME_MAP.get(ext, "audio/mp4")

    logger.info("Transcribe request: file=%s mime=%s", filename, mime_type)

    # Read the audio bytes
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    logger.info("Audio size: %d bytes", len(audio_bytes))

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)

        # Upload audio as inline data to Gemini
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    parts=[
                        types.Part(
                            inline_data=types.Blob(
                                mime_type=mime_type,
                                data=audio_bytes,
                            )
                        ),
                        types.Part(text=_TRANSCRIBE_PROMPT),
                    ]
                )
            ],
        )

        transcribed_text = (response.text or "").strip()
        logger.info("Transcribed: %r", transcribed_text[:120])

        if not transcribed_text:
            raise HTTPException(
                status_code=422,
                detail="Gemini could not transcribe the audio. Please speak clearly and try again.",
            )

        return TranscribeResponse(text=transcribed_text)

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Gemini transcription failed: %s", exc)
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(exc)[:200]}",
        )
