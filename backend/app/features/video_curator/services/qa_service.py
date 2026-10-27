"""In-Memory Video Transcript Ask & Jump Q&A Service (FR-10).

Provides focused, grounded Q&A with approximate timestamp anchors.
"""

import json
from typing import Any, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.errors import LLMServiceError
from app.features.video_curator.schemas import VideoQAResponse
from app.features.video_curator.services.llm_client import get_genai_client
from app.features.video_curator.services.prompts import build_qa_prompt
from app.features.video_curator.services.transcript_service import (
    get_cached_transcript,
    store_cached_transcript,
)
from app.features.video_curator.tools.youtube_tool import fetch_youtube_transcript


def answer_video_question(
    video_id: str,
    question: str,
    client: Optional[genai.Client] = None,
    fetch_transcript_fn: Optional[Any] = None,
) -> VideoQAResponse:
    """Answers a user question based on in-memory video transcript context (FR-10).

    Args:
        video_id: 11-char video ID.
        question: User query.
        client: Optional Gemini client.
        fetch_transcript_fn: Optional custom transcript fetcher.

    Returns:
        VideoQAResponse with direct answer and timestamp reference.

    Raises:
        LLMServiceError: On Gemini API failure.
    """
    transcript = get_cached_transcript(video_id)
    if not transcript:
        # If not cached yet, fetch on-the-fly and cache
        fetch_fn = fetch_transcript_fn or fetch_youtube_transcript
        transcript = fetch_fn(video_id)
        store_cached_transcript(transcript)

    gen_client = client or get_genai_client()
    qa_prompt = build_qa_prompt(transcript.formatted_text, question)

    try:
        response = gen_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=qa_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )

        response_text = response.text or ""
        parsed = json.loads(response_text)

        answer = str(parsed.get("answer", "Maaf, informasi tersebut tidak ditemukan dalam transkrip.")).strip()
        timestamp_ref = parsed.get("timestamp_reference")
        if timestamp_ref:
            timestamp_ref = str(timestamp_ref).strip()

        return VideoQAResponse(
            success=True,
            answer=answer,
            timestamp_reference=timestamp_ref or None,
        )
    except Exception as exc:
        raise LLMServiceError(
            f"Gagal memproses tanya-jawab video: {str(exc)}",
            details={"video_id": video_id, "question": question, "error": str(exc)},
        ) from exc
