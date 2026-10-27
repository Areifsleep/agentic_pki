"""Unit tests for deterministic Level 2 agent tools: youtube_tool and obsidian_tool."""

from pathlib import Path
from unittest.mock import MagicMock
import pytest

from app.core.errors import InvalidYouTubeURLError, TranscriptUnavailableError
from app.features.video_curator.tools.obsidian_tool import (
    resolve_unique_filepath,
    sanitize_category,
    sanitize_filename,
    save_markdown_to_vault,
)
from app.features.video_curator.tools.youtube_tool import (
    extract_video_id,
    fetch_youtube_transcript,
    format_seconds_to_timestamp,
)


class TestYouTubeTool:
    """Test suite for youtube_tool.py (FR-05, FR-06, FR-07)."""

    @pytest.mark.parametrize(
        "url,expected_id",
        [
            ("https://www.youtube.com/watch?v=kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://youtu.be/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://youtu.be/kqtD5dpn9C8?si=abcdef12345", "kqtD5dpn9C8"),
            ("https://www.youtube.com/shorts/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("https://www.youtube.com/embed/kqtD5dpn9C8", "kqtD5dpn9C8"),
            ("http://m.youtube.com/watch?v=kqtD5dpn9C8&feature=share", "kqtD5dpn9C8"),
            ("kqtD5dpn9C8", "kqtD5dpn9C8"),
        ],
    )
    def test_extract_video_id_valid_formats(self, url: str, expected_id: str):
        assert extract_video_id(url) == expected_id

    @pytest.mark.parametrize(
        "invalid_input",
        [
            "",
            "   ",
            "https://google.com",
            "https://youtube.com/watch?v=short",
            "not-a-valid-youtube-url",
            "12345",
        ],
    )
    def test_extract_video_id_invalid_raises_error(self, invalid_input: str):
        with pytest.raises(InvalidYouTubeURLError):
            extract_video_id(invalid_input)

    @pytest.mark.parametrize(
        "seconds,expected_timestamp",
        [
            (0, "00:00"),
            (45.8, "00:45"),
            (135.2, "02:15"),
            (3665, "01:01:05"),
            (7200, "02:00:00"),
        ],
    )
    def test_format_seconds_to_timestamp(self, seconds: float, expected_timestamp: str):
        assert format_seconds_to_timestamp(seconds) == expected_timestamp

    def test_fetch_transcript_success(self):
        mock_client = MagicMock()
        mock_fetched = MagicMock()
        mock_fetched.to_raw_data.return_value = [
            {"text": "Halo semuanya.", "start": 0.0, "duration": 2.5},
            {"text": "Selamat datang di tutorial FastAPI.", "start": 2.5, "duration": 3.0},
        ]
        mock_client.fetch.return_value = mock_fetched

        result = fetch_youtube_transcript("kqtD5dpn9C8", api_client=mock_client)

        assert result.video_id == "kqtD5dpn9C8"
        assert len(result.snippets) == 2
        assert "[00:00] Halo semuanya." in result.formatted_text
        assert "[00:02] Selamat datang di tutorial FastAPI." in result.formatted_text
        assert "Halo semuanya. Selamat datang di tutorial FastAPI." in result.plain_text

    def test_fetch_transcript_empty_raises_error(self):
        mock_client = MagicMock()
        mock_fetched = MagicMock()
        mock_fetched.to_raw_data.return_value = []
        mock_client.fetch.return_value = mock_fetched

        with pytest.raises(TranscriptUnavailableError):
            fetch_youtube_transcript("kqtD5dpn9C8", api_client=mock_client)


class TestObsidianTool:
    """Test suite for obsidian_tool.py (FR-11, FR-12, NFR-03)."""

    @pytest.mark.parametrize(
        "title,expected_stem",
        [
            ("Async IO and FastAPI", "async-io-and-fastapi.md"),
            ("Special: / ? < > \\ Characters!", "special-characters.md"),
            ("   Spaces   and --- Hyphens   ", "spaces-and-hyphens.md"),
            ("", "untitled-note.md"),
        ],
    )
    def test_sanitize_filename(self, title: str, expected_stem: str):
        assert sanitize_filename(title) == expected_stem

    @pytest.mark.parametrize(
        "category,expected_cat",
        [
            ("Python Architecture", "Python Architecture"),
            ("Backend/FastAPI", "Backend/FastAPI"),
            ("Web / API Design ?", "Web - API Design"),
            ("Investment / IHSG", "Investment - IHSG"),
            ("AI-Engineering/RAG", "AI-Engineering/RAG"),
            ("   ", "General"),
            ("", "General"),
        ],
    )
    def test_sanitize_category(self, category: str, expected_cat: str):
        assert sanitize_category(category) == expected_cat

    def test_save_markdown_to_vault_creates_subfolder_and_writes_file(self, tmp_path: Path):
        vault = tmp_path / "TestVault"
        category = "Backend Architecture"
        title = "FastAPI Background Tasks"
        content = "# FastAPI Background Tasks\n\nContent here."

        result = save_markdown_to_vault(
            vault_path=vault,
            category=category,
            title=title,
            content=content,
        )

        assert result.file_path.exists()
        assert result.file_path.parent == vault / "Backend Architecture"
        assert result.file_name == "fastapi-background-tasks.md"
        assert result.file_path.read_text(encoding="utf-8") == content
        assert result.bytes_written == len(content.encode("utf-8"))

    def test_save_markdown_resolves_collision_with_timestamp(self, tmp_path: Path):
        vault = tmp_path / "TestVault"
        category = "Python"
        title = "Same Title"
        content1 = "First version"
        content2 = "Second version"

        res1 = save_markdown_to_vault(vault, category, title, content1)
        res2 = save_markdown_to_vault(vault, category, title, content2)

        # Both files must physically exist and not overwrite each other (NFR-03)
        assert res1.file_path.exists()
        assert res2.file_path.exists()
        assert res1.file_path != res2.file_path
        assert res1.file_path.read_text(encoding="utf-8") == content1
        assert res2.file_path.read_text(encoding="utf-8") == content2

    def test_save_markdown_with_hierarchical_category_and_transcript(self, tmp_path: Path):
        vault = tmp_path / "TestVault"
        category = "Backend/FastAPI"
        title = "Dependency Injection"
        content = "# Dependency Injection\n\n```python\ndef get_db(): pass\n```\n\nPenjelasan mendalam tentang DI."
        transcript = "[00:00] Intro\n[01:00] Deep dive DI"

        result = save_markdown_to_vault(
            vault_path=vault,
            category=category,
            title=title,
            content=content,
            video_id="abc123xyz78",
            transcript_text=transcript,
            index_summary="Panduan dependency injection di FastAPI.",
            tags=["fastapi", "di"],
        )

        assert result.file_path.exists()
        assert result.file_path.parent == vault / "Backend" / "FastAPI"
        assert result.category == "Backend/FastAPI"

        # Check transcript isolation
        transcript_file = vault / "_transcripts" / "abc123xyz78.txt"
        assert transcript_file.exists()
        assert transcript_file.read_text(encoding="utf-8") == transcript

        # Check vault index entry
        from app.features.video_curator.tools.obsidian_tool import get_vault_index
        index_items = get_vault_index(vault)
        assert len(index_items) == 1
        entry = index_items[0]
        assert entry["category"] == "Backend/FastAPI"
        assert entry["video_id"] == "abc123xyz78"
        assert entry["transcript_path"] == "_transcripts/abc123xyz78.txt"
        assert entry["summary"] == "Panduan dependency injection di FastAPI."
        assert "fastapi" in entry["tags"]
