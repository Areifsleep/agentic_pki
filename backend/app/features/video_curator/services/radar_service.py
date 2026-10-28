"""Autonomous Learning Radar Discovery & Batch Micro-Triage Service.

Orchestrates Scrape Wide & Triage Narrow architecture:
1. Scrapes ~24 raw candidates per request deterministically.
2. Applies 3-tier deduplication (Vault Blacklist, Session Seen Cache, Dismissed IDs).
3. Buffers un-triaged candidates in memory and triages lazily in batches of 6.
4. Seamlessly replenishes the candidate buffer using YouTube native continuation tokens.
"""

from dataclasses import dataclass, field
import json
import time
from typing import Any, Dict, List, Optional
import uuid
from google import genai
from google.genai import types

from app.core.config import settings
from app.features.video_curator.schemas import (
    RadarDiscoverResponse,
    RadarVideoItem,
)
from app.features.video_curator.services.llm_client import get_genai_client
from app.features.video_curator.services.prompts import build_radar_triage_prompt
from app.features.video_curator.tools.obsidian_tool import (
    get_focus_targets,
    get_vault_video_ids,
)
from app.features.video_curator.tools.radar_tool import (
    CandidateVideo,
    RadarSearchResult,
    fetch_continuation_candidates,
    search_candidate_videos,
)


@dataclass
class RadarSearchBuffer:
    """In-memory state for an active Radar discovery session."""

    search_id: str
    query: str
    sort_by: str
    unprocessed_candidates: List[CandidateVideo] = field(default_factory=list)
    continuation_token: Optional[str] = None
    seen_video_ids: set[str] = field(default_factory=set)
    created_at: float = field(default_factory=time.time)


# Global in-memory buffer store for Radar searches
_RADAR_BUFFERS: Dict[str, RadarSearchBuffer] = {}
BUFFER_TTL_SECONDS = 7200  # 2 hours


def get_radar_buffer(search_id: str) -> Optional[RadarSearchBuffer]:
    """Retrieves an existing Radar search buffer."""
    return _RADAR_BUFFERS.get(search_id)


def clear_radar_buffers() -> None:
    """Clears all Radar search buffers (useful for testing)."""
    _RADAR_BUFFERS.clear()


def clean_stale_radar_buffers() -> None:
    """Removes search buffers older than TTL."""
    now = time.time()
    stale_keys = [
        k for k, buf in _RADAR_BUFFERS.items() if (now - buf.created_at) > BUFFER_TTL_SECONDS
    ]
    for k in stale_keys:
        _RADAR_BUFFERS.pop(k, None)


def triage_radar_videos(
    query: Optional[str] = None,
    sort_by: str = "relevance",
    search_id: Optional[str] = None,
    dismissed_ids: Optional[List[str]] = None,
    client: Optional[genai.Client] = None,
    search_candidates_fn: Optional[Any] = None,
) -> RadarDiscoverResponse:
    """Discovers and evaluates candidate YouTube videos using Scrape Wide & Lazy Micro-Triage.

    1. Determines topic query from focus targets or explicit input.
    2. Applies 3-tier deduplication:
       - Layer 1: Vault Blacklist (videos already in Obsidian Vault).
       - Layer 2: Session Seen Cache (videos already shown in this search session).
       - Layer 3: Dismissed IDs (videos manually ignored by user).
    3. Feeds only 6 clean candidates to Gemini per batch prompt.
    4. Automatically consumes continuation tokens to refill buffer when exhausted.
    """
    clean_stale_radar_buffers()
    search_fn = search_candidates_fn or search_candidate_videos

    # Layer 1: Permanent Blacklist from Obsidian Vault
    try:
        vault_ids = get_vault_video_ids(settings.curator_vault_path)
    except Exception:
        vault_ids = set()

    # Layer 3: Manual Dismiss IDs
    dismissed_set = set(dismissed_ids or [])

    # Learning Preferences
    focus_targets = get_focus_targets(settings.curator_vault_path)
    topics = focus_targets.get("topics", [])
    anti_goals = focus_targets.get("anti_goals", [])
    depth_preset = focus_targets.get("depth_preset", "deepdive")

    buffer: Optional[RadarSearchBuffer] = None

    if search_id and search_id in _RADAR_BUFFERS:
        # Existing session buffer
        buffer = _RADAR_BUFFERS[search_id]
        buffer.seen_video_ids.update(dismissed_set)
    else:
        # New search initiation
        if query and query.strip():
            search_query = query.strip()
        elif topics:
            search_query = f"{topics[0]} {topics[1] if len(topics) > 1 else ''}".strip()
        else:
            search_query = "Python Architecture and Modern Engineering"

        # Deterministic wide search (~24 candidates in 1 HTTP request)
        search_outcome = search_fn(search_query, max_candidates=24, sort_by=sort_by)

        if isinstance(search_outcome, RadarSearchResult):
            raw_candidates = search_outcome.candidates
            continuation_token = search_outcome.continuation_token
        elif isinstance(search_outcome, list):
            raw_candidates = search_outcome
            continuation_token = getattr(search_outcome, "continuation_token", None)
        else:
            raw_candidates = []
            continuation_token = None

        # Apply Layer 1 (Vault) & Layer 3 (Dismissed) deduplication
        clean_candidates = [
            c for c in raw_candidates
            if c.video_id not in vault_ids and c.video_id not in dismissed_set
        ]

        new_search_id = str(uuid.uuid4())
        buffer = RadarSearchBuffer(
            search_id=new_search_id,
            query=search_query,
            sort_by=sort_by,
            unprocessed_candidates=clean_candidates,
            continuation_token=continuation_token,
            seen_video_ids=set(dismissed_set),
            created_at=time.time(),
        )
        _RADAR_BUFFERS[new_search_id] = buffer

    # If buffer has fewer than 6 candidates, try replenishing using continuation token
    while len(buffer.unprocessed_candidates) < 6 and buffer.continuation_token:
        cont_res = fetch_continuation_candidates(buffer.continuation_token, max_candidates=24)
        buffer.continuation_token = cont_res.continuation_token

        new_clean = [
            c for c in cont_res.candidates
            if (
                c.video_id not in vault_ids
                and c.video_id not in buffer.seen_video_ids
                and c.video_id not in dismissed_set
                and not any(x.video_id == c.video_id for x in buffer.unprocessed_candidates)
            )
        ]

        if not new_clean and not cont_res.continuation_token:
            break

        buffer.unprocessed_candidates.extend(new_clean)

    # Slice up to 6 candidates for micro-triage
    batch_candidates = buffer.unprocessed_candidates[:6]
    buffer.unprocessed_candidates = buffer.unprocessed_candidates[6:]

    if not batch_candidates:
        return RadarDiscoverResponse(
            success=True,
            videos=[],
            query_used=buffer.query,
            total_evaluated=0,
            search_id=buffer.search_id,
            has_more=False,
            continuation_available=bool(buffer.continuation_token),
        )

    # Batch Micro-Triage via Gemini
    triage_prompt = build_radar_triage_prompt(
        candidates=batch_candidates,
        topics=topics,
        depth_preset=depth_preset,
        anti_goals=anti_goals,
    )

    gen_client = client or get_genai_client()
    evaluated_items: List[RadarVideoItem] = []

    try:
        response = gen_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=triage_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
            ),
        )
        response_text = response.text or ""
        parsed = json.loads(response_text)

        eval_map = {}
        if isinstance(parsed, list):
            for item in parsed:
                if isinstance(item, dict) and "video_id" in item:
                    eval_map[str(item["video_id"])] = item

        for c in batch_candidates:
            ev = eval_map.get(c.video_id, {})
            score = int(ev.get("match_score", 75))
            topic = str(ev.get("topic_tag", f"#{topics[0] if topics else 'Learning'}")).strip()
            if not topic.startswith("#"):
                topic = f"#{topic}"
            diff = str(ev.get("difficulty", "Intermediate")).strip()
            why = str(ev.get("why_you_care", f"Membahas topik {c.title} yang relevan dengan pilar belajar Anda.")).strip()
            time_hint = str(ev.get("time_roi_hint", f"Estimasi durasi total {c.duration_str}")).strip()

            evaluated_items.append(
                RadarVideoItem(
                    video_id=c.video_id,
                    title=c.title,
                    channel=c.channel,
                    duration_str=c.duration_str,
                    thumbnail_url=c.thumbnail_url,
                    match_score=max(0, min(100, score)),
                    topic_tag=topic,
                    difficulty=diff,
                    why_you_care=why,
                    time_roi_hint=time_hint,
                )
            )
    except Exception:
        # Fallback heuristic if model fails
        for c in batch_candidates:
            evaluated_items.append(
                RadarVideoItem(
                    video_id=c.video_id,
                    title=c.title,
                    channel=c.channel,
                    duration_str=c.duration_str,
                    thumbnail_url=c.thumbnail_url,
                    match_score=80,
                    topic_tag=f"#{topics[0] if topics else 'Learning'}",
                    difficulty="Intermediate",
                    why_you_care=f"Rekomendasi materi relevan untuk {c.title}.",
                    time_roi_hint=f"Durasi {c.duration_str}",
                )
            )

    # Mark batch video IDs as seen in session buffer (Layer 2)
    for c in batch_candidates:
        buffer.seen_video_ids.add(c.video_id)

    # Sort descending by match score
    evaluated_items.sort(key=lambda v: v.match_score, reverse=True)

    has_more = len(buffer.unprocessed_candidates) > 0 or bool(buffer.continuation_token)

    return RadarDiscoverResponse(
        success=True,
        videos=evaluated_items,
        query_used=buffer.query,
        total_evaluated=len(evaluated_items),
        search_id=buffer.search_id,
        has_more=has_more,
        continuation_available=bool(buffer.continuation_token),
    )
