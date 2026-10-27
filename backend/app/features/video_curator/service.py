"""Public Facade for Video Curator Services.

Re-exports modularized services (Synthesis, In-Memory Transcript Cache, Q&A,
Vault RAG, Focus Studio, and Learning Radar) following Clean Architecture
and backward compatibility for routers and test suites.
"""

from typing import Any, Dict, List, Optional
from google import genai

from app.features.video_curator.schemas import (
    CuratorConfig,
    ProcessVideoRequest,
    ProcessVideoResponse,
    RadarDiscoverResponse,
    SynthesizeVideoResponse,
    VaultChatResponse,
    VaultNoteItem,
    VideoQAResponse,
)
import app.features.video_curator.services.focus_service as _focus_impl
import app.features.video_curator.services.llm_client as _llm_client_mod
import app.features.video_curator.services.prompts as _prompts_impl
import app.features.video_curator.services.qa_service as _qa_impl
import app.features.video_curator.services.radar_service as _radar_impl
import app.features.video_curator.services.synthesis_service as _synthesis_impl
import app.features.video_curator.services.transcript_service as _transcript_impl
import app.features.video_curator.services.vault_service as _vault_impl
from app.features.video_curator.tools.obsidian_tool import (
    get_existing_categories,
    get_focus_targets,
    get_vault_index,
    get_vault_video_ids,
    save_focus_targets,
    save_markdown_to_vault,
)
from app.features.video_curator.tools.radar_tool import (
    CandidateVideo,
    RadarSearchResult,
    fetch_continuation_candidates,
    search_candidate_videos,
    search_candidate_videos_with_continuation,
)
from app.features.video_curator.tools.youtube_tool import (
    TranscriptResult,
    TranscriptSnippet,
    extract_video_id,
    fetch_youtube_transcript,
)

# Transcripts cache
_TRANSCRIPT_CACHE = _transcript_impl._TRANSCRIPT_CACHE
get_cached_transcript = _transcript_impl.get_cached_transcript
store_cached_transcript = _transcript_impl.store_cached_transcript
clear_transcript_cache = _transcript_impl.clear_transcript_cache

# Radar buffers
_RADAR_BUFFERS = _radar_impl._RADAR_BUFFERS
get_radar_buffer = _radar_impl.get_radar_buffer
clear_radar_buffers = _radar_impl.clear_radar_buffers

# Prompts
build_synthesis_prompt = _prompts_impl.build_synthesis_prompt
build_qa_prompt = _prompts_impl.build_qa_prompt
build_radar_triage_prompt = _prompts_impl.build_radar_triage_prompt
build_vault_router_prompt = _prompts_impl.build_vault_router_prompt
build_vault_synthesis_prompt = _prompts_impl.build_vault_synthesis_prompt
build_focus_variations_prompt = _prompts_impl.build_focus_variations_prompt

# Focus
generate_topic_query_variations = _focus_impl.generate_topic_query_variations

# Vault notes
list_vault_notes = _vault_impl.list_vault_notes


def get_genai_client(api_key: Optional[str] = None) -> genai.Client:
    return _llm_client_mod.get_genai_client(api_key=api_key)


def synthesize_video_note(
    transcript_result: TranscriptResult,
    config: CuratorConfig,
    video_url: str,
    client: Optional[genai.Client] = None,
) -> Dict[str, Any]:
    import app.features.video_curator.service as this_mod
    return _synthesis_impl.synthesize_video_note(
        transcript_result=transcript_result,
        config=config,
        video_url=video_url,
        client=client,
        client_provider=this_mod.get_genai_client,
    )


def process_video_curation(
    request: ProcessVideoRequest,
    client: Optional[genai.Client] = None,
) -> ProcessVideoResponse:
    import app.features.video_curator.service as this_mod
    return _synthesis_impl.process_video_curation(
        request=request,
        client=client,
        fetch_transcript_fn=this_mod.fetch_youtube_transcript,
        client_provider=this_mod.get_genai_client,
    )


def synthesize_video_pipeline(
    request: ProcessVideoRequest,
    client: Optional[genai.Client] = None,
) -> SynthesizeVideoResponse:
    import app.features.video_curator.service as this_mod
    return _synthesis_impl.synthesize_video_pipeline(
        request=request,
        client=client,
        fetch_transcript_fn=this_mod.fetch_youtube_transcript,
        client_provider=this_mod.get_genai_client,
    )


def answer_video_question(
    video_id: str,
    question: str,
    client: Optional[genai.Client] = None,
) -> VideoQAResponse:
    import app.features.video_curator.service as this_mod
    actual_client = client or this_mod.get_genai_client()
    return _qa_impl.answer_video_question(
        video_id=video_id,
        question=question,
        client=actual_client,
        fetch_transcript_fn=this_mod.fetch_youtube_transcript,
    )


def triage_radar_videos(
    query: Optional[str] = None,
    sort_by: str = "relevance",
    search_id: Optional[str] = None,
    dismissed_ids: Optional[List[str]] = None,
    client: Optional[genai.Client] = None,
) -> RadarDiscoverResponse:
    import app.features.video_curator.service as this_mod
    actual_client = client or this_mod.get_genai_client()
    return _radar_impl.triage_radar_videos(
        query=query,
        sort_by=sort_by,
        search_id=search_id,
        dismissed_ids=dismissed_ids,
        client=actual_client,
        search_candidates_fn=this_mod.search_candidate_videos,
    )


def answer_vault_chat(
    question: str,
    client: Optional[genai.Client] = None,
) -> VaultChatResponse:
    import app.features.video_curator.service as this_mod
    actual_client = client or this_mod.get_genai_client()
    return _vault_impl.answer_vault_chat(
        question=question,
        client=actual_client,
    )


__all__ = [
    # GenAI Client
    "get_genai_client",
    # Prompts
    "build_synthesis_prompt",
    "build_qa_prompt",
    "build_radar_triage_prompt",
    "build_vault_router_prompt",
    "build_vault_synthesis_prompt",
    "build_focus_variations_prompt",
    # Transcript Store
    "_TRANSCRIPT_CACHE",
    "get_cached_transcript",
    "store_cached_transcript",
    "clear_transcript_cache",
    # Synthesis & Curation
    "synthesize_video_note",
    "process_video_curation",
    "synthesize_video_pipeline",
    # Q&A
    "answer_video_question",
    # Vault RAG
    "list_vault_notes",
    "answer_vault_chat",
    # Learning Radar
    "_RADAR_BUFFERS",
    "triage_radar_videos",
    "get_radar_buffer",
    "clear_radar_buffers",
    # Focus Studio
    "generate_topic_query_variations",
    # Tools re-exports
    "fetch_youtube_transcript",
    "search_candidate_videos",
    "search_candidate_videos_with_continuation",
    "fetch_continuation_candidates",
    "save_markdown_to_vault",
    "get_focus_targets",
    "save_focus_targets",
    "get_vault_index",
    "get_vault_video_ids",
    "get_existing_categories",
    "extract_video_id",
    "CandidateVideo",
    "RadarSearchResult",
    "TranscriptResult",
    "TranscriptSnippet",
    "VaultNoteItem",
]
