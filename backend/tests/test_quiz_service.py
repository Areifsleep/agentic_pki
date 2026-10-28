"""Unit and Integration tests for Active Recall Quiz & Flashcards Service."""

import json
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pytest

from app.core.errors import LLMServiceError
from app.features.video_curator.schemas import (
    QuizQuestionItem,
    VideoQuizRequest,
    VideoQuizResponse,
)
from app.features.video_curator.service import (
    clear_transcript_cache,
    generate_active_recall_quiz,
    store_cached_transcript,
)
from app.features.video_curator.tools.youtube_tool import (
    TranscriptResult,
    TranscriptSnippet,
)
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_cache():
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


class TestQuizService:
    """Test suite for quiz_service.py."""

    def test_quiz_generation_success(self):
        dummy_tr = create_dummy_transcript("kqtD5dpn9C8")
        store_cached_transcript(dummy_tr)

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps([
            {
                "id": "q1",
                "question": "Mengapa def biasa dialihkan ke threadpool?",
                "options": [
                    "Agar tidak memblokir main event loop",
                    "Karena Python tidak mendukung asynchronous I/O",
                    "Untuk menghemat alokasi memori RAM",
                    "Agar kompatibel dengan Django ORM"
                ],
                "correct_answer_index": 0,
                "explanation": "Def biasa dialihkan ke threadpool agar blocking I/O tidak membekukan event loop.",
                "timestamp_reference": "02:15",
                "flashcard_front": "Apa fungsi threadpool pada fungsi def biasa di FastAPI?",
                "flashcard_back": "Mengeksekusi blocking I/O secara aman tanpa menahan event loop utama."
            }
        ])
        mock_client.models.generate_content.return_value = mock_response

        res = generate_active_recall_quiz(
            video_id="kqtD5dpn9C8",
            num_questions=1,
            client=mock_client,
        )

        assert res.success is True
        assert res.video_id == "kqtD5dpn9C8"
        assert res.total_questions == 1
        assert len(res.questions) == 1
        q = res.questions[0]
        assert q.id == "q1"
        assert q.correct_answer_index == 0
        assert q.timestamp_reference == "02:15"
        assert q.flashcard_front.startswith("Apa fungsi")

    def test_quiz_generation_from_markdown_when_transcript_missing(self):
        # Transcript cache is empty, transcript fetch will fail, but markdown provided
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps([
            {
                "id": "q1",
                "question": "Apa itu Pydantic v2?",
                "options": ["Validasi Rust engine", "Database SQLite", "Web framework", "CSS linter"],
                "correct_answer_index": 0,
                "explanation": "Pydantic v2 ditenagai oleh mesin Rust.",
                "timestamp_reference": "01:00",
                "flashcard_front": "Apa keunggulan Pydantic v2?",
                "flashcard_back": "Kecepatan validasi berkat Rust core."
            }
        ])
        mock_client.models.generate_content.return_value = mock_response

        res = generate_active_recall_quiz(
            video_id="abc12345678",
            markdown_content="# Catatan Panjang Mengenai Pydantic v2 dan Python Architecture Modern...",
            num_questions=1,
            client=mock_client,
            fetch_transcript_fn=MagicMock(side_effect=Exception("No transcript")),
        )

        assert res.success is True
        assert res.total_questions == 1

    def test_quiz_generation_empty_context_raises_error(self):
        with pytest.raises(LLMServiceError) as exc_info:
            generate_active_recall_quiz(
                video_id="notranscript",
                markdown_content="",
                client=MagicMock(),
                fetch_transcript_fn=MagicMock(side_effect=Exception("Disabled")),
            )
        assert "tidak tersedia" in str(exc_info.value)

    def test_quiz_generation_invalid_json_raises_error(self):
        dummy_tr = create_dummy_transcript("kqtD5dpn9C8")
        store_cached_transcript(dummy_tr)

        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "NOT_A_VALID_JSON"
        mock_client.models.generate_content.return_value = mock_response

        with pytest.raises(LLMServiceError):
            generate_active_recall_quiz(
                video_id="kqtD5dpn9C8",
                client=mock_client,
            )


class TestQuizRouterEndpoint:
    """Test suite for POST /api/v1/video/quiz."""

    @patch("app.features.video_curator.router.generate_active_recall_quiz")
    def test_quiz_endpoint_success(self, mock_generate):
        mock_generate.return_value = VideoQuizResponse(
            success=True,
            video_id="kqtD5dpn9C8",
            total_questions=1,
            questions=[
                QuizQuestionItem(
                    id="q1",
                    question="Pertanyaan?",
                    options=["A", "B"],
                    correct_answer_index=0,
                    explanation="Penjelasan",
                    timestamp_reference="01:30",
                    flashcard_front="Front",
                    flashcard_back="Back",
                )
            ],
        )

        resp = client.post(
            "/api/v1/video/quiz",
            json={
                "video_id": "kqtD5dpn9C8",
                "markdown_content": "# Note",
                "num_questions": 3,
            },
        )

        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["video_id"] == "kqtD5dpn9C8"
        assert len(data["questions"]) == 1

    def test_quiz_endpoint_validation_error(self):
        resp = client.post(
            "/api/v1/video/quiz",
            json={
                "video_id": "",
            },
        )
        assert resp.status_code == 422


class TestQuizVaultPersistence:
    """Test suite for saving and retrieving quizzes from Obsidian Vault."""

    def test_save_and_get_quiz_data(self, tmp_path):
        from app.features.video_curator.tools.obsidian_tool import (
            get_quiz_data,
            save_quiz_data,
        )

        quiz_dict = {
            "video_id": "test_vid_123",
            "total_questions": 1,
            "questions": [
                {
                    "id": "q1",
                    "question": "Apa itu async def?",
                    "options": ["Coroutine", "Threadpool"],
                    "correct_answer_index": 0,
                    "explanation": "Penjelasan",
                    "timestamp_reference": "01:00",
                    "flashcard_front": "Front",
                    "flashcard_back": "Back",
                }
            ],
        }

        rel_path = save_quiz_data(tmp_path, "test_vid_123", quiz_dict)
        assert rel_path == "_quizzes/test_vid_123.json"
        assert (tmp_path / "_quizzes" / "test_vid_123.json").exists()

        loaded = get_quiz_data(tmp_path, "test_vid_123")
        assert loaded is not None
        assert loaded["video_id"] == "test_vid_123"
        assert len(loaded["questions"]) == 1

    def test_save_markdown_with_quiz_hybrid(self, tmp_path):
        from app.features.video_curator.tools.obsidian_tool import (
            get_quiz_data,
            save_markdown_to_vault,
        )

        quiz_dict = {
            "video_id": "vid_hybrid_1",
            "total_questions": 1,
            "questions": [
                {
                    "id": "q1",
                    "question": "Pertanyaan Hybrid?",
                    "options": ["Opsi A", "Opsi B"],
                    "correct_answer_index": 0,
                    "explanation": "Penjelasan hybrid",
                    "timestamp_reference": "02:30",
                    "flashcard_front": "F",
                    "flashcard_back": "B",
                }
            ],
        }

        res = save_markdown_to_vault(
            vault_path=tmp_path,
            category="Backend",
            title="Hybrid Note",
            content="# Hybrid Note Content\nsource: https://youtube.com/watch?v=vid_hybrid_1",
            video_id="vid_hybrid_1",
            quiz_data=quiz_dict,
        )

        assert res.file_path.exists()
        saved_text = res.file_path.read_text(encoding="utf-8")
        assert "## 🧠 Active Recall & Self-Quiz" in saved_text
        assert "> [!question] Soal 1: Pertanyaan Hybrid? `[02:30]`" in saved_text
        assert "> > [!success]- Kunci Jawaban & Pembahasan" in saved_text

        # Verify JSON sidecar also exists
        assert (tmp_path / "_quizzes" / "vid_hybrid_1.json").exists()
        loaded = get_quiz_data(tmp_path, "vid_hybrid_1")
        assert loaded is not None

    def test_vault_quiz_endpoints(self, tmp_path):
        from app.core.config import settings

        settings.OBSIDIAN_VAULT_PATH = tmp_path / "Vault"

        quiz_payload = {
            "video_id": "vid_api_1234",
            "quiz_data": {
                "video_id": "vid_api_1234",
                "questions": [
                    {
                        "id": "q1",
                        "question": "Tes API?",
                        "options": ["Ya", "Tidak"],
                        "correct_answer_index": 0,
                        "explanation": "Alasan",
                        "timestamp_reference": "00:45",
                        "flashcard_front": "Q",
                        "flashcard_back": "A",
                    }
                ],
            },
        }

        # 1. Save quiz endpoint
        post_resp = client.post("/api/v1/vault/quiz/save", json=quiz_payload)
        assert post_resp.status_code == 200
        post_data = post_resp.json()
        assert post_data["success"] is True
        assert post_data["quiz_path"] == "_quizzes/vid_api_1234.json"

        # 2. Get quiz endpoint
        get_resp = client.get("/api/v1/vault/quiz?video_id=vid_api_1234")
        assert get_resp.status_code == 200
        get_data = get_resp.json()
        assert get_data["success"] is True
        assert get_data["video_id"] == "vid_api_1234"
        assert len(get_data["questions"]) == 1

        # 3. Get non-existent quiz returns 404
        get_404 = client.get("/api/v1/vault/quiz?video_id=nonexistent")
        assert get_404.status_code == 404
