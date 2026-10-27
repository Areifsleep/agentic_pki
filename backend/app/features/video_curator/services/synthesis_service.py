"""LLM Video Synthesis & Curation Pipeline Services.

Handles prompt invocation via official google-genai SDK, markdown generation,
automatic category assignment, and physical persistence to local Obsidian Vault.
"""

import json
import time
from typing import Any, Dict, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.errors import LLMServiceError
from app.features.video_curator.schemas import (
    CuratorConfig,
    ProcessVideoRequest,
    ProcessVideoResponse,
    SynthesizeVideoResponse,
)
from app.features.video_curator.services.llm_client import get_genai_client
from app.features.video_curator.services.prompts import build_synthesis_prompt
from app.features.video_curator.services.transcript_service import store_cached_transcript
from app.features.video_curator.tools.obsidian_tool import (
    get_existing_categories,
    get_focus_targets,
    save_markdown_to_vault,
)
from app.features.video_curator.tools.youtube_tool import (
    TranscriptResult,
    fetch_youtube_transcript,
)


def synthesize_video_note(
    transcript_result: TranscriptResult,
    config: CuratorConfig,
    video_url: str,
    client: Optional[genai.Client] = None,
    client_provider: Optional[Any] = None,
) -> Dict[str, Any]:
    """Sends dynamic prompt to Gemini to categorize and synthesize video notes (FR-08, FR-09).

    Args:
        transcript_result: Transcript data with timestamps and text.
        config: User's parameter options.
        video_url: URL of the video.
        client: Optional Gemini client (useful for mocking).
        client_provider: Optional callable returning a Gemini client.

    Returns:
        Dict containing 'category', 'video_title', and 'markdown_content'.

    Raises:
        LLMServiceError: If API call fails or JSON format is malformed.
    """
    provider = client_provider or get_genai_client
    gen_client = client or provider()

    try:
        existing_cats = get_existing_categories(settings.curator_vault_path)
        focus_targets = get_focus_targets(settings.curator_vault_path)
    except Exception:
        existing_cats = []
        focus_targets = None

    prompt = build_synthesis_prompt(
        transcript_text=transcript_result.formatted_text,
        config=config,
        video_url=video_url,
        existing_categories=existing_cats,
        focus_targets=focus_targets,
    )

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
        parsed = json.loads(response_text)

        if not isinstance(parsed, dict) or "markdown_content" not in parsed:
            raise ValueError("Respons JSON model tidak memiliki atribut 'markdown_content'.")

        category = str(parsed.get("category", "General")).strip() or "General"
        video_title = (
            str(parsed.get("video_title", f"Video {transcript_result.video_id}")).strip()
            or f"Video {transcript_result.video_id}"
        )
        markdown_content = str(parsed.get("markdown_content", "")).strip()
        index_summary = str(parsed.get("index_summary", "")).strip() or None
        tags = [str(t).strip().lower() for t in parsed.get("tags", []) if str(t).strip()]

        return {
            "category": category,
            "video_title": video_title,
            "index_summary": index_summary,
            "tags": tags,
            "markdown_content": markdown_content,
        }
    except json.JSONDecodeError as exc:
        raise LLMServiceError(
            f"Gagal mengurai respons JSON dari model AI: {str(exc)}",
            details={"raw_response": response_text if "response_text" in locals() else None},
        ) from exc
    except Exception as exc:
        if isinstance(exc, LLMServiceError):
            raise
        raise LLMServiceError(
            f"Kendala saat inferensi Gemini API: {str(exc)}",
            details={"model": settings.GEMINI_MODEL, "error": str(exc)},
        ) from exc


def process_video_curation(
    request: ProcessVideoRequest,
    client: Optional[genai.Client] = None,
    fetch_transcript_fn: Optional[Any] = None,
    client_provider: Optional[Any] = None,
) -> ProcessVideoResponse:
    """Full orchestration pipeline for video curation:

    1. Deterministic Transcript Ingestion (FR-05, FR-06)
    2. In-memory transcript caching (FR-10)
    3. Dynamic Prompting & Gemini Synthesis (FR-08, FR-09)
    4. Local Obsidian Vault File Persistence (FR-11, FR-12, NFR-03)
    """
    start_time = time.perf_counter()
    fetch_fn = fetch_transcript_fn or fetch_youtube_transcript

    # Step 1: Ingest transcript deterministically
    transcript = fetch_fn(request.video_url)

    # Step 2: Store in memory for instant subsequent Q&A
    store_cached_transcript(transcript)

    # Step 3: LLM Synthesis with dynamic prompt
    synthesis = synthesize_video_note(
        transcript_result=transcript,
        config=request.config,
        video_url=request.video_url,
        client=client,
        client_provider=client_provider,
    )

    # Step 4: Physical file persistence in Obsidian Vault
    save_result = save_markdown_to_vault(
        vault_path=settings.curator_vault_path,
        category=synthesis["category"],
        title=synthesis["video_title"],
        content=synthesis["markdown_content"],
        video_id=transcript.video_id,
        transcript_text=transcript.formatted_text,
        index_summary=synthesis.get("index_summary"),
        tags=synthesis.get("tags"),
    )

    execution_duration = round(time.perf_counter() - start_time, 2)

    return ProcessVideoResponse(
        success=True,
        video_id=transcript.video_id,
        category=save_result.category,
        video_title=synthesis["video_title"],
        file_name=save_result.file_name,
        file_path=str(save_result.file_path),
        markdown_content=synthesis["markdown_content"],
        execution_time_seconds=execution_duration,
        message="Catatan berhasil dirangkum dan disimpan ke subfolder kategori Obsidian.",
    )


def synthesize_video_pipeline(
    request: ProcessVideoRequest,
    client: Optional[genai.Client] = None,
    fetch_transcript_fn: Optional[Any] = None,
    client_provider: Optional[Any] = None,
) -> SynthesizeVideoResponse:
    """In-memory synthesis pipeline without writing to disk (Review-First).

    1. Deterministic Transcript Ingestion (FR-05, FR-06)
    2. In-memory transcript caching for instant Q&A (FR-10)
    3. Dynamic Prompting & Gemini Synthesis (FR-08, FR-09)
    """
    start_time = time.perf_counter()
    fetch_fn = fetch_transcript_fn or fetch_youtube_transcript

    # Step 1: Ingest transcript deterministically
    transcript = fetch_fn(request.video_url)

    # Step 2: Store in memory for instant subsequent Q&A
    store_cached_transcript(transcript)

    # Step 3: LLM Synthesis with dynamic prompt
    synthesis = synthesize_video_note(
        transcript_result=transcript,
        config=request.config,
        video_url=request.video_url,
        client=client,
        client_provider=client_provider,
    )

    execution_duration = round(time.perf_counter() - start_time, 2)

    return SynthesizeVideoResponse(
        success=True,
        video_id=transcript.video_id,
        category=synthesis["category"],
        video_title=synthesis["video_title"],
        markdown_content=synthesis["markdown_content"],
        index_summary=synthesis.get("index_summary"),
        tags=synthesis.get("tags", []),
        transcript_text=transcript.formatted_text,
        execution_time_seconds=execution_duration,
        message="Materi berhasil dirangkum dan siap ditinjau sebelum disimpan.",
    )
