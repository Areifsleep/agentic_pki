"""Integration tests for FastAPI endpoints in app/features/video_curator/router.py."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
import pytest

from app.core.config import settings
from app.features.video_curator.service import (
    clear_transcript_cache,
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


class TestProcessVideoEndpoint:
    """Tests for POST /api/v1/video/process."""

    @patch("app.features.video_curator.service.fetch_youtube_transcript")
    @patch("app.features.video_curator.service.get_genai_client")
    def test_process_video_success(self, mock_get_client, mock_fetch, tmp_path: Path):
        settings.OBSIDIAN_VAULT_PATH = tmp_path / "Vault"

        dummy_tr = create_dummy_transcript("kqtD5dpn9C8")
        mock_fetch.return_value = dummy_tr

        mock_gen_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "category": "Python Architecture",
            "video_title": "Async IO and Background Tasks in FastAPI",
            "markdown_content": (
                "---\ntitle: Async IO and Background Tasks in FastAPI\n"
                "category: Python Architecture\n---\n"
                "## Core Mental Model\nFastAPI menjalankan async route..."
            ),
        })
        mock_gen_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_gen_client

        payload = {
            "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
            "config": {
                "mode": "cheatsheet",
                "include_timestamps": True,
                "include_pitfalls": True,
                "include_code": True,
            },
        }

        response = client.post("/api/v1/video/process", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert data["video_id"] == "kqtD5dpn9C8"
        assert data["category"] == "Python Architecture"
        assert data["video_title"] == "Async IO and Background Tasks in FastAPI"
        assert data["file_name"] == "async-io-and-background-tasks-in-fastapi.md"
        assert "Python Architecture" in data["file_path"]
        assert "## Core Mental Model" in data["markdown_content"]
        assert isinstance(data["execution_time_seconds"], (int, float))

    def test_process_video_invalid_url_returns_422(self):
        response = client.post("/api/v1/video/process", json={"video_url": "not-a-valid-url"})
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert "tidak valid" in data["error"]


class TestVideoQAEndpoint:
    """Tests for POST /api/v1/video/qa."""

    @patch("app.features.video_curator.service.get_genai_client")
    def test_video_qa_success(self, mock_get_client):
        # Pre-populate cache
        dummy_tr = create_dummy_transcript("kqtD5dpn9C8")
        store_cached_transcript(dummy_tr)

        mock_gen_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "answer": (
                "Di menit 02:15 pembicara menjelaskan bahwa def biasa akan dilempar ke external threadpool."
            ),
            "timestamp_reference": "02:15",
        })
        mock_gen_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_gen_client

        payload = {
            "video_id": "kqtD5dpn9C8",
            "question": "Bagian mana yang menjelaskan beda async def sama def biasa?",
        }

        response = client.post("/api/v1/video/qa", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert "02:15" in data["answer"]
        assert data["timestamp_reference"] == "02:15"

    def test_video_qa_empty_fields_returns_422(self):
        response = client.post("/api/v1/video/qa", json={"video_id": "", "question": ""})
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False


class TestSynthesizeVideoEndpoint:
    """Tests for POST /api/v1/video/synthesize (Review-First)."""

    @patch("app.features.video_curator.service.fetch_youtube_transcript")
    @patch("app.features.video_curator.service.get_genai_client")
    def test_synthesize_video_success(self, mock_get_client, mock_fetch):
        dummy_tr = create_dummy_transcript("kqtD5dpn9C8")
        mock_fetch.return_value = dummy_tr

        mock_gen_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps({
            "category": "Web Dev",
            "video_title": "Understanding FastAPI",
            "markdown_content": "# FastAPI Note\nContent here...",
        })
        mock_gen_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_gen_client

        payload = {
            "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
            "config": {
                "mode": "cheatsheet",
                "include_timestamps": True,
                "include_pitfalls": True,
                "include_code": True,
                "custom_prompt": "Fokus pada routing",
            },
        }

        response = client.post("/api/v1/video/synthesize", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["success"] is True
        assert data["video_id"] == "kqtD5dpn9C8"
        assert data["category"] == "Web Dev"
        assert data["video_title"] == "Understanding FastAPI"
        assert "# FastAPI Note" in data["markdown_content"]
        assert "file_path" not in data  # Review-First: no file created yet


class TestVaultEndpoints:
    """Tests for /api/v1/vault/*."""

    def test_save_and_list_vault_notes(self, tmp_path: Path):
        settings.OBSIDIAN_VAULT_PATH = tmp_path / "Vault"

        save_payload = {
            "category": "Backend Architecture",
            "title": "FastAPI Testing Guide",
            "content": "# Testing Guide\nUse pytest with TestClient.",
        }

        # 1. Save note
        save_resp = client.post("/api/v1/vault/save", json=save_payload)
        assert save_resp.status_code == 200
        save_data = save_resp.json()
        assert save_data["success"] is True
        assert save_data["category"] == "Backend Architecture"
        assert "fastapi-testing-guide" in save_data["file_name"]
        assert save_data["bytes_written"] > 0

        # 2. List notes
        list_resp = client.get("/api/v1/vault/notes")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert list_data["success"] is True
        assert list_data["total"] == 1
        assert list_data["notes"][0]["category"] == "Backend Architecture"

        # 3. Read specific note content
        note_path = save_data["file_path"]
        read_resp = client.get(f"/api/v1/vault/note?path={note_path}")
        assert read_resp.status_code == 200
        read_data = read_resp.json()
        assert read_data["success"] is True
        assert "Use pytest with TestClient." in read_data["content"]

        # 4. Get vault settings
        settings_resp = client.get("/api/v1/vault/settings")
        assert settings_resp.status_code == 200
        settings_data = settings_resp.json()
        assert settings_data["success"] is True
        assert "vault_path" in settings_data
        assert settings_data["total_notes"] == 1

        # 5. Update vault settings with custom path
        new_vault = tmp_path / "CustomVault"
        update_resp = client.post(
            "/api/v1/vault/settings",
            json={"vault_path": str(new_vault), "curator_folder_name": "My Curator"},
        )
        assert update_resp.status_code == 200
        update_data = update_resp.json()
        assert update_data["success"] is True
        assert update_data["vault_path"] == str(new_vault)
        assert update_data["curator_folder_name"] == "My Curator"
        assert Path(update_data["curator_vault_path"]).exists()

        # 6. Validate empty path raises 422
        bad_resp = client.post("/api/v1/vault/settings", json={"vault_path": "   "})
        assert bad_resp.status_code == 422


class TestFocusEndpoints:
    """Tests for GET/POST /api/v1/focus."""

    def test_get_and_save_focus(self, tmp_path: Path):
        settings.OBSIDIAN_VAULT_PATH = tmp_path / "Vault"

        # 1. Get default focus targets
        get_res = client.get("/api/v1/focus")
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["success"] is True
        assert len(data["topics"]) > 0

        # 2. Update focus targets
        update_payload = {
            "topics": ["FastAPI", "Agentic PKI", "Distributed Systems"],
            "depth_preset": "code_action",
            "anti_goals": ["Vlog tanpa coding", "Video pemula"],
        }
        post_res = client.post("/api/v1/focus", json=update_payload)
        assert post_res.status_code == 200
        post_data = post_res.json()
        assert post_data["success"] is True
        assert "Agentic PKI" in post_data["topics"]
        assert post_data["depth_preset"] == "code_action"

        # 3. Verify file exists in vault
        focus_file = settings.curator_vault_path / "my_focus.md"
        assert focus_file.exists()
        assert "#Agentic PKI" in focus_file.read_text(encoding="utf-8")


class TestRadarAndVaultChatEndpoints:
    """Tests for /api/v1/radar/discover and /api/v1/vault/chat."""

    @patch("app.features.video_curator.service.search_candidate_videos")
    @patch("app.features.video_curator.service.get_genai_client")
    def test_radar_discover_success(self, mock_get_client, mock_search):
        from app.features.video_curator.tools.radar_tool import CandidateVideo

        mock_search.return_value = [
            CandidateVideo(
                video_id="abc12345678",
                title="FastAPI Architecture Tutorial",
                channel="Tech Lead",
                duration_str="18:42",
                duration_minutes=18.7,
                description="Deep dive into clean architecture in FastAPI.",
                thumbnail_url="https://img.youtube.com/vi/abc12345678/hqdefault.jpg",
            )
        ]

        mock_gen_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = json.dumps([
            {
                "video_id": "abc12345678",
                "match_score": 92,
                "topic_tag": "#Backend",
                "difficulty": "Intermediate",
                "why_you_care": "Menjelaskan clean architecture FastAPI.",
                "time_roi_hint": "Materi padat di 04:10-18:30",
            }
        ])
        mock_gen_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_gen_client

        resp = client.post("/api/v1/radar/discover", json={"query": "FastAPI"})
        assert resp.status_code == 200
        res_data = resp.json()
        assert res_data["success"] is True
        assert len(res_data["videos"]) == 1
        assert res_data["videos"][0]["video_id"] == "abc12345678"
        assert res_data["videos"][0]["match_score"] == 92

    @patch("app.features.video_curator.service.get_genai_client")
    def test_vault_chat_success(self, mock_get_client, tmp_path: Path):
        settings.OBSIDIAN_VAULT_PATH = tmp_path / "Vault"

        # Save dummy note
        client.post(
            "/api/v1/vault/save",
            json={
                "category": "Backend",
                "title": "FastAPI Guide",
                "content": "# FastAPI Guide\nAsync def handles concurrent I/O.",
            },
        )

        mock_gen_client = MagicMock()
        mock_router_resp = MagicMock()
        mock_router_resp.text = json.dumps({
            "selected_files": ["Backend/fastapi-guide.md"]
        })

        mock_synth_resp = MagicMock()
        mock_synth_resp.text = "FastAPI menggunakan async def untuk menangani non-blocking I/O [fastapi-guide.md]."

        mock_gen_client.models.generate_content.side_effect = [mock_router_resp, mock_synth_resp]
        mock_get_client.return_value = mock_gen_client

        resp = client.post("/api/v1/vault/chat", json={"question": "Bagaimana async di FastAPI?"})
        assert resp.status_code == 200
        res_data = resp.json()
        assert res_data["success"] is True
        assert "async def" in res_data["answer"]
        assert len(res_data["cited_files"]) > 0
