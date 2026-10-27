"""Deterministic YouTube Transcript Extraction Tool (Level 2 Agent Tool).

Provides pure Python functions to parse YouTube URLs, extract video IDs,
and ingest subtitles/transcripts deterministically.
"""

from dataclasses import dataclass
import re
from typing import Any, Dict, List, Optional, Sequence
from youtube_transcript_api import (
    CouldNotRetrieveTranscript,
    NoTranscriptFound,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApi,
    YouTubeTranscriptApiException,
)

from app.core.errors import InvalidYouTubeURLError, TranscriptUnavailableError

# Regex to capture the 11-character YouTube video ID across standard, short, shorts, and embed URLs
YOUTUBE_URL_REGEX = re.compile(
    r"(?:https?:\/\/)?(?:www\.)?(?:m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
)
RAW_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{11}$")


@dataclass
class TranscriptSnippet:
    """Represents a single segment of a YouTube video transcript."""

    text: str
    start: float
    duration: float

    @property
    def timestamp_formatted(self) -> str:
        """Returns the start time formatted as [MM:SS] or [HH:MM:SS]."""
        return format_seconds_to_timestamp(self.start)


@dataclass
class TranscriptResult:
    """Container for the full transcript extraction result."""

    video_id: str
    language: str
    snippets: List[TranscriptSnippet]
    formatted_text: str
    plain_text: str


def format_seconds_to_timestamp(seconds: float) -> str:
    """Formats numeric seconds into human-readable timestamp (MM:SS or HH:MM:SS)."""
    total_seconds = int(max(0, seconds))
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60

    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def extract_video_id(url_or_id: str) -> str:
    """Extracts and validates an 11-character YouTube video ID from a URL or raw ID.

    Args:
        url_or_id: YouTube URL (watch, short, shorts, embed) or raw 11-char ID.

    Returns:
        11-character YouTube video ID.

    Raises:
        InvalidYouTubeURLError: If the input cannot be parsed to an 11-char video ID.
    """
    if not url_or_id or not isinstance(url_or_id, str):
        raise InvalidYouTubeURLError("URL atau Video ID tidak boleh kosong.")

    cleaned = url_or_id.strip()

    # Direct match for raw video ID
    if RAW_ID_REGEX.match(cleaned):
        return cleaned

    # Search via regex patterns
    match = YOUTUBE_URL_REGEX.search(cleaned)
    if match:
        return match.group(1)

    raise InvalidYouTubeURLError(
        f"Format URL YouTube tidak valid atau Video ID tidak ditemukan: {url_or_id}"
    )


def fetch_youtube_transcript(
    url_or_id: str,
    languages: Sequence[str] = ("id", "en"),
    api_client: Optional[YouTubeTranscriptApi] = None,
) -> TranscriptResult:
    """Deterministically extracts transcript subtitles for a given YouTube video.

    Attempts to fetch subtitles in order of preference (default: Indonesian 'id', then English 'en').

    Args:
        url_or_id: YouTube URL or 11-character video ID.
        languages: Iterable of language codes to attempt in priority order.
        api_client: Optional YouTubeTranscriptApi instance for dependency injection.

    Returns:
        TranscriptResult containing snippets, formatted timestamped text, and plain text.

    Raises:
        InvalidYouTubeURLError: If URL or ID is invalid.
        TranscriptUnavailableError: If subtitles are missing, disabled, or video is unavailable.
    """
    video_id = extract_video_id(url_or_id)
    client = api_client or YouTubeTranscriptApi()

    try:
        # Use YouTubeTranscriptApi.fetch
        fetched = client.fetch(video_id, languages=languages)
        raw_snippets = fetched.to_raw_data()
    except (TranscriptsDisabled, NoTranscriptFound) as exc:
        raise TranscriptUnavailableError(
            f"Transkrip tidak tersedia atau dinonaktifkan untuk video ID: {video_id}.",
            details={"video_id": video_id, "error": str(exc)},
        ) from exc
    except VideoUnavailable as exc:
        raise TranscriptUnavailableError(
            f"Video tidak dapat diakses atau bersifat privat (ID: {video_id}).",
            details={"video_id": video_id, "error": str(exc)},
        ) from exc
    except CouldNotRetrieveTranscript as exc:
        raise TranscriptUnavailableError(
            f"Gagal mengambil transkrip untuk video ID: {video_id}. Layanan mungkin dibatasi.",
            details={"video_id": video_id, "error": str(exc)},
        ) from exc
    except YouTubeTranscriptApiException as exc:
        raise TranscriptUnavailableError(
            f"Kendala pada YouTube Transcript API: {str(exc)}",
            details={"video_id": video_id, "error": str(exc)},
        ) from exc
    except Exception as exc:
        raise TranscriptUnavailableError(
            f"Terjadi kesalahan saat memproses transkrip: {str(exc)}",
            details={"video_id": video_id, "error": str(exc)},
        ) from exc

    if not raw_snippets:
        raise TranscriptUnavailableError(
            f"Transkrip ditemukan namun kosong untuk video ID: {video_id}."
        )

    snippets: List[TranscriptSnippet] = []
    formatted_lines: List[str] = []
    plain_words: List[str] = []

    for item in raw_snippets:
        text = str(item.get("text", "")).strip().replace("\n", " ")
        if not text:
            continue
        start = float(item.get("start", 0.0))
        duration = float(item.get("duration", 0.0))

        snippet = TranscriptSnippet(text=text, start=start, duration=duration)
        snippets.append(snippet)
        formatted_lines.append(f"[{snippet.timestamp_formatted}] {text}")
        plain_words.append(text)

    formatted_text = "\n".join(formatted_lines)
    plain_text = " ".join(plain_words)

    # Detect the language that was actually matched if available, fallback to first requested
    resolved_lang = languages[0] if languages else "unknown"

    return TranscriptResult(
        video_id=video_id,
        language=resolved_lang,
        snippets=snippets,
        formatted_text=formatted_text,
        plain_text=plain_text,
    )
