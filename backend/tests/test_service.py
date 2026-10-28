"""Unit tests for service.py (Dynamic Prompt Engine, Synthesis, In-Memory QA, Orchestration)."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from app.core.errors import LLMServiceError
from app.features.video_curator.schemas import (
    CuratorConfig,
    ProcessVideoRequest,
    SummaryMode,
)
from app.features.video_curator.service import (
    answer_video_question,
    build_synthesis_prompt,
    clear_transcript_cache,
    get_cached_transcript,
    process_video_curation,
    store_cached_transcript,
    synthesize_video_note,
)
from app.features.video_curator.services.synthesis_service import (
    clean_and_parse_synthesis_json,
)
from app.features.video_curator.tools.youtube_tool import (
    TranscriptResult,
    TranscriptSnippet,
)


@pytest.fixture(autouse=True)
def clean_cache():
    """Ensure in-memory cache is clean before and after each test."""
    clear_transcript_cache()
    yield
    clear_transcript_cache()


def create_dummy_transcript(video_id: str = "kqtD5dpn9C8") -> TranscriptResult:
    snippets = [
        TranscriptSnippet(text="Halo semuanya.", start=0.0, duration=2.0),
        TranscriptSnippet(
            text="Berikut adalah perbedaan async def dan def biasa.",
            start=135.0,
            duration=5.0,
        ),
    ]
    formatted = "[00:00] Halo semuanya.\n[02:15] Berikut adalah perbedaan async def dan def biasa."
    plain = "Halo semuanya. Berikut adalah perbedaan async def dan def biasa."
    return TranscriptResult(
        video_id=video_id,
        language="id",
        snippets=snippets,
        formatted_text=formatted,
        plain_text=plain,
    )


class TestDynamicPromptAssembly:
    """Test suite for build_synthesis_prompt (FR-08)."""

    def test_cheatsheet_mode_prompt(self):
        config = CuratorConfig(
            mode=SummaryMode.CHEATSHEET,
            include_timestamps=True,
            include_pitfalls=True,
            include_code=True,
        )
        prompt = build_synthesis_prompt("Transcript content", config, "https://youtube.com/watch?v=123")
        assert "MODE: Quick Cheat-Sheet" in prompt
        assert "WAJIB cantumkan penanda waktu perkiraan [MM:SS]" in prompt
        assert "WAJIB sertakan bagian '## Common Pitfalls & Mistakes'" in prompt
        assert "WAJIB sertakan blok kode praktis" in prompt

    def test_deepdive_mode_prompt(self):
        config = CuratorConfig(
            mode=SummaryMode.DEEPDIVE,
            include_timestamps=False,
            include_pitfalls=False,
            include_code=False,
        )
        prompt = build_synthesis_prompt("Transcript content", config, "https://youtube.com/watch?v=123")
        assert "MODE: Deep Dive / Study Guide" in prompt
        assert "Tidak ada modul tambahan aktif." in prompt

    def test_code_action_mode_prompt(self):
        config = CuratorConfig(
            mode=SummaryMode.CODE_ACTION,
            include_timestamps=True,
            include_pitfalls=False,
            include_code=True,
        )
        prompt = build_synthesis_prompt("Transcript content", config, "https://youtube.com/watch?v=123")
        assert "MODE: Code & Action Only" in prompt
        assert "WAJIB cantumkan penanda waktu perkiraan [MM:SS]" in prompt
        assert "## Common Pitfalls & Mistakes" not in prompt


class TestInMemoryQACache:
    """Test suite for in-memory transcript store (FR-10)."""

    def test_store_and_retrieve_transcript(self):
        transcript = create_dummy_transcript("abc12345678")
        assert get_cached_transcript("abc12345678") is None

        store_cached_transcript(transcript)
        cached = get_cached_transcript("abc12345678")
        assert cached is not None
        assert cached.video_id == "abc12345678"
        assert len(cached.snippets) == 2


class TestGeminiSynthesis:
    """Test suite for synthesize_video_note and error handling (FR-09)."""

    def test_synthesize_video_note_success(self):
        dummy_tr = create_dummy_transcript()
        config = CuratorConfig()

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "category": "Python Architecture",
            "video_title": "Async IO in FastAPI",
            "markdown_content": "---\ntitle: Async IO in FastAPI\n---\n# Notes here",
        })
        mock_client.models.generate_content.return_value = mock_response

        res = synthesize_video_note(dummy_tr, config, "https://youtu.be/kqtD5dpn9C8", client=mock_client)

        assert res["category"] == "Python Architecture"
        assert res["video_title"] == "Async IO in FastAPI"
        assert "# Notes here" in res["markdown_content"]

    def test_clean_and_parse_synthesis_json_with_code_fences_and_unescaped_newlines(self):
        # Raw response with ```json code fence and unescaped control newlines in string
        raw_text = """```json
{
  "category": "Backend/FastAPI",
  "video_title": "FastAPI Crash Course",
  "index_summary": "Panduan cepat FastAPI dan async IO.",
  "tags": ["fastapi", "python"],
  "markdown_content": "# FastAPI Crash Course
Line 1 content
Line 2 with unescaped newline"
}
```"""
        parsed = clean_and_parse_synthesis_json(raw_text, "test1234567")
        assert parsed["category"] == "Backend/FastAPI"
        assert parsed["video_title"] == "FastAPI Crash Course"
        assert "Line 1 content" in parsed["markdown_content"]
        assert "fastapi" in parsed["tags"]

    def test_clean_and_parse_synthesis_json_regex_recovery_on_truncated_json(self):
        # Truncated response before closing bracket
        truncated_raw = """{
  "category": "DevOps/Docker",
  "video_title": "Docker in Production",
  "index_summary": "Rangkuman setup container docker.",
  "tags": ["docker"],
  "markdown_content": "# Docker in Production\\n- Step 1: Write Dockerfile\\n- Step 2: Build"""
        parsed = clean_and_parse_synthesis_json(truncated_raw, "test1234567")
        assert parsed["category"] == "DevOps/Docker"
        assert parsed["video_title"] == "Docker in Production"
        assert "Dockerfile" in parsed["markdown_content"]

    def test_synthesize_invalid_json_raises_llm_error(self):
        dummy_tr = create_dummy_transcript()
        config = CuratorConfig()

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "NOT JSON CONTENT"
        mock_client.models.generate_content.return_value = mock_response

        with pytest.raises(LLMServiceError):
            synthesize_video_note(dummy_tr, config, "https://youtu.be/kqtD5dpn9C8", client=mock_client)


class TestAnswerVideoQuestion:
    """Test suite for in-memory Ask & Jump Q&A (FR-10)."""

    def test_answer_video_question_with_cached_transcript(self):
        transcript = create_dummy_transcript("kqtD5dpn9C8")
        store_cached_transcript(transcript)

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "answer": "Def biasa dijalankan di threadpool eksternal.",
            "timestamp_reference": "02:15",
        })
        mock_client.models.generate_content.return_value = mock_response

        res = answer_video_question("kqtD5dpn9C8", "Apa beda def biasa?", client=mock_client)

        assert res.success is True
        assert res.answer == "Def biasa dijalankan di threadpool eksternal."
        assert res.timestamp_reference == "02:15"


class TestOrchestrationPipeline:
    """Test suite for end-to-end process_video_curation."""

    @patch("app.features.video_curator.service.fetch_youtube_transcript")
    def test_process_video_curation_end_to_end(self, mock_fetch, tmp_path: Path):
        from app.core.config import settings

        # Temporarily redirect vault path to tmp_path
        settings.OBSIDIAN_VAULT_PATH = tmp_path / "MyVault"

        dummy_tr = create_dummy_transcript("kqtD5dpn9C8")
        mock_fetch.return_value = dummy_tr

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "category": "FastAPI",
            "video_title": "Async IO Guide",
            "markdown_content": "# Markdown Guide Content",
        })
        mock_client.models.generate_content.return_value = mock_response

        req = ProcessVideoRequest(video_url="https://www.youtube.com/watch?v=kqtD5dpn9C8")
        response = process_video_curation(req, client=mock_client)

        assert response.success is True
        assert response.video_id == "kqtD5dpn9C8"
        assert response.category == "FastAPI"
        assert response.video_title == "Async IO Guide"
        assert response.file_name == "async-io-guide.md"
        assert Path(response.file_path).exists()
        saved_text = Path(response.file_path).read_text(encoding="utf-8")
        assert "# Markdown Guide Content" in saved_text
        assert "<details>" not in saved_text
        transcript_path = settings.curator_vault_path / "_transcripts" / "kqtD5dpn9C8.txt"
        assert transcript_path.exists()
        assert "Berikut adalah perbedaan async def dan def biasa." in transcript_path.read_text(encoding="utf-8")
        assert get_cached_transcript("kqtD5dpn9C8") is not None
