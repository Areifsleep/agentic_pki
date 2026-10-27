"""Modular Services for Video Curator, Synthesis, Q&A, Vault RAG, and Radar.

Follows Single Responsibility Principle and Clean Architecture standards.
"""

from app.features.video_curator.services.focus_service import (
    generate_topic_query_variations,
)
from app.features.video_curator.services.llm_client import get_genai_client
from app.features.video_curator.services.prompts import (
    build_focus_variations_prompt,
    build_qa_prompt,
    build_radar_triage_prompt,
    build_synthesis_prompt,
    build_vault_router_prompt,
    build_vault_synthesis_prompt,
)
from app.features.video_curator.services.qa_service import answer_video_question
from app.features.video_curator.services.radar_service import (
    clear_radar_buffers,
    get_radar_buffer,
    triage_radar_videos,
)
from app.features.video_curator.services.synthesis_service import (
    process_video_curation,
    synthesize_video_note,
    synthesize_video_pipeline,
)
from app.features.video_curator.services.transcript_service import (
    clear_transcript_cache,
    get_cached_transcript,
    store_cached_transcript,
)
from app.features.video_curator.services.vault_service import (
    answer_vault_chat,
    list_vault_notes,
)

__all__ = [
    "get_genai_client",
    "build_synthesis_prompt",
    "build_qa_prompt",
    "build_radar_triage_prompt",
    "build_vault_router_prompt",
    "build_vault_synthesis_prompt",
    "build_focus_variations_prompt",
    "get_cached_transcript",
    "store_cached_transcript",
    "clear_transcript_cache",
    "synthesize_video_note",
    "process_video_curation",
    "synthesize_video_pipeline",
    "answer_video_question",
    "list_vault_notes",
    "answer_vault_chat",
    "triage_radar_videos",
    "get_radar_buffer",
    "clear_radar_buffers",
    "generate_topic_query_variations",
]
