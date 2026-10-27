"""In-Memory Transcript Store & Cache (FR-10, Zero Vector DB Overhead).

Stores fetched YouTube transcripts during active sessions to allow instantaneous
Ask & Jump Q&A without refetching or paying Vector DB indexing overhead.
"""

from typing import Dict, Optional
from app.features.video_curator.tools.youtube_tool import TranscriptResult

# Global in-memory cache for transcripts of videos inspected during session
_TRANSCRIPT_CACHE: Dict[str, TranscriptResult] = {}


def get_cached_transcript(video_id: str) -> Optional[TranscriptResult]:
    """Retrieves a transcript from the in-memory cache."""
    return _TRANSCRIPT_CACHE.get(video_id)


def store_cached_transcript(transcript: TranscriptResult) -> None:
    """Stores a transcript into the in-memory cache."""
    _TRANSCRIPT_CACHE[transcript.video_id] = transcript


def clear_transcript_cache() -> None:
    """Clears the in-memory transcript cache (useful for testing)."""
    _TRANSCRIPT_CACHE.clear()
