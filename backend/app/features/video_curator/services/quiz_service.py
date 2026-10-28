"""Active Recall Quiz & Flashcards Generation Service.

Synthesizes high-yield conceptual quiz questions and 3D flashcards directly
from in-memory transcripts and curated markdown notes to empower active learning.
"""

import json
import re
from typing import Any, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.errors import LLMServiceError
from app.features.video_curator.schemas import (
    QuizQuestionItem,
    VideoQuizResponse,
)
from app.features.video_curator.services.llm_client import get_genai_client
from app.features.video_curator.services.prompts import build_quiz_prompt
from app.features.video_curator.services.transcript_service import (
    get_cached_transcript,
    store_cached_transcript,
)
from app.features.video_curator.tools.youtube_tool import fetch_youtube_transcript


def generate_active_recall_quiz(
    video_id: str,
    markdown_content: Optional[str] = None,
    num_questions: int = 4,
    client: Optional[genai.Client] = None,
    fetch_transcript_fn: Optional[Any] = None,
) -> VideoQuizResponse:
    """Generates conceptual active recall quiz questions and flashcards.

    Args:
        video_id: 11-char YouTube video ID.
        markdown_content: Optional curated markdown note content.
        num_questions: Desired question count (2-8).
        client: Optional Gemini client.
        fetch_transcript_fn: Optional custom transcript fetcher.

    Returns:
        VideoQuizResponse containing structured questions and flashcards.

    Raises:
        LLMServiceError: If Gemini API fails or returns invalid structure.
    """
    context_material = ""

    # Priority 1: Use curated markdown note if rich
    if markdown_content and len(markdown_content.strip()) > 50:
        context_material += f"CATATAN RINGKASAN:\n{markdown_content.strip()}\n\n"

    # Priority 2: Ingest transcript context for granular timestamp anchors
    transcript = get_cached_transcript(video_id)
    if not transcript:
        try:
            fetch_fn = fetch_transcript_fn or fetch_youtube_transcript
            transcript = fetch_fn(video_id)
            store_cached_transcript(transcript)
        except Exception:
            # If transcript fetch fails but markdown exists, proceed with markdown alone
            pass

    if transcript:
        context_material += f"TRANSKRIP DENGAN TIMESTAMP:\n{transcript.formatted_text[:12000]}"

    if not context_material.strip():
        raise LLMServiceError("Materi pembelajaran atau transkrip untuk kuis tidak tersedia.")

    gen_client = client or get_genai_client()
    prompt = build_quiz_prompt(context_material, num_questions=num_questions)

    try:
        response = gen_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.3,
            ),
        )

        response_text = response.text or ""
        # Clean potential markdown fences
        clean_json = re.sub(r"^```(?:json)?\r?\n", "", response_text.strip())
        clean_json = re.sub(r"\r?\n```$", "", clean_json).strip()

        raw_list = json.loads(clean_json)
        if isinstance(raw_list, dict) and "questions" in raw_list:
            raw_list = raw_list["questions"]
        elif not isinstance(raw_list, list):
            raw_list = []

        questions: List[QuizQuestionItem] = []
        for idx, item in enumerate(raw_list):
            if not isinstance(item, dict):
                continue
            qid = str(item.get("id") or f"q{idx + 1}")
            q_text = str(item.get("question", "")).strip()
            opts = item.get("options", [])
            if not isinstance(opts, list) or len(opts) < 2:
                continue

            correct_idx = item.get("correct_answer_index", 0)
            try:
                correct_idx = int(correct_idx)
                if correct_idx < 0 or correct_idx >= len(opts):
                    correct_idx = 0
            except Exception:
                correct_idx = 0

            explanation = str(item.get("explanation", "Penjelasan konsep inti materi.")).strip()
            ts_ref = item.get("timestamp_reference")
            if ts_ref:
                ts_ref = str(ts_ref).strip()

            fc_front = str(item.get("flashcard_front") or q_text).strip()
            fc_back = str(item.get("flashcard_back") or (opts[correct_idx] if opts else "")).strip()

            questions.append(
                QuizQuestionItem(
                    id=qid,
                    question=q_text,
                    options=[str(o).strip() for o in opts],
                    correct_answer_index=correct_idx,
                    explanation=explanation,
                    timestamp_reference=ts_ref,
                    flashcard_front=fc_front,
                    flashcard_back=fc_back,
                )
            )

        if not questions:
            raise LLMServiceError("Model tidak menghasilkan pertanyaan kuis yang valid.")

        return VideoQuizResponse(
            success=True,
            video_id=video_id,
            total_questions=len(questions),
            questions=questions,
        )

    except LLMServiceError:
        raise
    except Exception as exc:
        raise LLMServiceError(
            f"Gagal menghasilkan kuis Active Recall: {str(exc)}",
            details={"video_id": video_id, "error": str(exc)},
        ) from exc
