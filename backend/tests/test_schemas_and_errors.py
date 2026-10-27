"""Unit tests for Pydantic DTO schemas and centralized error handling (NFR-04)."""

from fastapi.testclient import TestClient
import pytest
from pydantic import ValidationError

from app.core.errors import InvalidYouTubeURLError, TranscriptUnavailableError
from app.features.video_curator.schemas import (
    CuratorConfig,
    ProcessVideoRequest,
    ProcessVideoResponse,
    SummaryMode,
    VideoQARequest,
    VideoQAResponse,
)
from app.main import app

client = TestClient(app)


class TestSchemas:
    """Test suite for Pydantic v2 DTO schemas."""

    def test_default_curator_config(self):
        config = CuratorConfig()
        assert config.mode == SummaryMode.CHEATSHEET
        assert config.include_timestamps is True
        assert config.include_pitfalls is True
        assert config.include_code is True

    def test_custom_curator_config(self):
        config = CuratorConfig(
            mode=SummaryMode.DEEPDIVE,
            include_timestamps=False,
            include_pitfalls=False,
            include_code=True,
        )
        assert config.mode == SummaryMode.DEEPDIVE
        assert config.include_timestamps is False

    def test_process_video_request_validation(self):
        req = ProcessVideoRequest(
            video_url="https://www.youtube.com/watch?v=kqtD5dpn9C8",
            config=CuratorConfig(mode=SummaryMode.CODE_ACTION),
        )
        assert req.video_url == "https://www.youtube.com/watch?v=kqtD5dpn9C8"
        assert req.config.mode == SummaryMode.CODE_ACTION

    def test_process_video_request_empty_url_raises_validation_error(self):
        with pytest.raises(ValidationError):
            ProcessVideoRequest(video_url="   ")

    def test_video_qa_request_validation(self):
        req = VideoQARequest(
            video_id="kqtD5dpn9C8",
            question="Di mana penjelasan concurrency?",
        )
        assert req.video_id == "kqtD5dpn9C8"
        assert req.question == "Di mana penjelasan concurrency?"

    def test_video_qa_request_empty_raises_validation_error(self):
        with pytest.raises(ValidationError):
            VideoQARequest(video_id="", question="Ada apa?")

        with pytest.raises(ValidationError):
            VideoQARequest(video_id="kqtD5dpn9C8", question="   ")


class TestErrorHandlers:
    """Test suite for centralized error handling and NFR-04 JSON contracts."""

    def test_health_check_endpoint(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "vault_path_configured" in data

    def test_custom_app_exception_returns_clean_json(self):
        # Dynamically attach a temporary test route
        @app.get("/test/custom-error")
        def route_error():
            raise InvalidYouTubeURLError("Custom URL error message")

        response = client.get("/test/custom-error")
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "Custom URL error message"

    def test_validation_error_returns_clean_json(self):
        # Trigger validation failure via mock endpoint
        @app.post("/test/schema-validation")
        def route_validation(payload: ProcessVideoRequest):
            return {"ok": True}

        response = client.post("/test/schema-validation", json={"video_url": ""})
        assert response.status_code == 422
        data = response.json()
        assert data["success"] is False
        assert "Parameter permintaan tidak valid." in data["error"]
        assert "validation_errors" in data["details"]
