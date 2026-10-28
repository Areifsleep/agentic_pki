"""Unit tests for Radar Optimization, Continuation Tokens, 3-Layer Deduplication, and Buffer Pagination."""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from app.core.config import settings
from app.features.video_curator.schemas import (
    RadarDiscoverRequest,
    RadarDiscoverResponse,
)
from app.features.video_curator.services.radar_service import (
    clear_radar_buffers,
    get_radar_buffer,
    triage_radar_videos,
)
from app.features.video_curator.tools.obsidian_tool import (
    get_vault_video_ids,
    save_markdown_to_vault,
)
from app.features.video_curator.tools.radar_tool import (
    CandidateVideo,
    RadarSearchResult,
    _parse_video_renderer,
    extract_continuation_token,
    parse_duration_to_minutes,
    search_candidate_videos,
    search_candidate_videos_with_continuation,
)


@pytest.fixture(autouse=True)
def clean_buffers():
    """Ensure radar buffer is clear before and after each test."""
    clear_radar_buffers()
    yield
    clear_radar_buffers()


def make_candidate(vid: str, title: str = "Test Video", duration_str: str = "10:00") -> CandidateVideo:
    return CandidateVideo(
        video_id=vid,
        title=title,
        channel="Tech Channel",
        duration_str=duration_str,
        duration_minutes=10.0,
        description=f"Description for {title}",
        thumbnail_url=f"https://img.youtube.com/vi/{vid}/hqdefault.jpg",
    )


class TestRadarToolScrapingAndPagination:
    """Tests for radar_tool.py features (wide scraping, sort filters, continuation token)."""

    def test_duration_parsing(self):
        assert parse_duration_to_minutes("05:30") == 5.5
        assert parse_duration_to_minutes("1:00:00") == 60.0
        assert parse_duration_to_minutes("45") == 0.75

    def test_duration_filter_range_rejections(self):
        # Short video < 3m should be rejected
        short_renderer = {
            "videoId": "short123456",
            "title": {"runs": [{"text": "Short Video"}]},
            "lengthText": {"simpleText": "02:45"},
        }
        assert _parse_video_renderer(short_renderer) is None

        # Massive video > 240m should be rejected
        huge_renderer = {
            "videoId": "huge1234567",
            "title": {"runs": [{"text": "Massive Stream"}]},
            "lengthText": {"simpleText": "04:30:00"},
        }
        assert _parse_video_renderer(huge_renderer) is None

        # Valid 5m video should be accepted
        valid_renderer = {
            "videoId": "valid123456",
            "title": {"runs": [{"text": "Good Tutorial"}]},
            "lengthText": {"simpleText": "05:15"},
            "ownerText": {"runs": [{"text": "Python Dev"}]},
        }
        cand = _parse_video_renderer(valid_renderer)
        assert cand is not None
        assert cand.video_id == "valid123456"
        assert cand.duration_str == "05:15"

    def test_extract_continuation_token(self):
        data = {
            "contents": {
                "twoColumnSearchResultsRenderer": {
                    "primaryContents": {
                        "sectionListRenderer": {
                            "contents": [
                                {
                                    "continuationItemRenderer": {
                                        "continuationEndpoint": {
                                            "continuationCommand": {
                                                "token": "token_abc_123"
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        }
        token = extract_continuation_token(data)
        assert token == "token_abc_123"

    def test_radar_search_result_iterable(self):
        candidates = [make_candidate("abc12345678"), make_candidate("def87654321")]
        res = RadarSearchResult(candidates=candidates, continuation_token="token_xyz")

        assert len(res) == 2
        assert res[0].video_id == "abc12345678"
        assert [c.video_id for c in res] == ["abc12345678", "def87654321"]
        assert res.continuation_token == "token_xyz"


class Test3LayerDeduplicationAndBuffer:
    """Tests for 3-layer deduplication and buffer pagination in radar_service.py."""

    def test_vault_blacklist_extraction(self, tmp_path: Path):
        vault_dir = tmp_path / "MyVault"
        vault_dir.mkdir()

        # Save note with source URL
        save_markdown_to_vault(
            vault_path=vault_dir,
            category="Backend",
            title="FastAPI Guide",
            content="---\nsource: https://www.youtube.com/watch?v=vault_vid01\n---\n# Content",
        )

        extracted = get_vault_video_ids(vault_dir)
        assert "vault_vid01" in extracted

    @patch("app.features.video_curator.services.radar_service.search_candidate_videos")
    @patch("app.features.video_curator.services.radar_service.get_vault_video_ids")
    def test_triage_radar_3_layer_deduplication(self, mock_vault_ids, mock_search):
        # Layer 1: In vault
        mock_vault_ids.return_value = {"in_vault_001"}

        # Scrape returns 8 videos
        candidates = [
            make_candidate("in_vault_001", "Already Studied Video"),
            make_candidate("dismissed01", "Unwanted Video"),
            make_candidate("clean_vid01", "Clean Video 1"),
            make_candidate("clean_vid02", "Clean Video 2"),
            make_candidate("clean_vid03", "Clean Video 3"),
            make_candidate("clean_vid04", "Clean Video 4"),
            make_candidate("clean_vid05", "Clean Video 5"),
            make_candidate("clean_vid06", "Clean Video 6"),
            make_candidate("buffer_vid1", "Buffer Video 1"),
        ]
        mock_search.return_value = RadarSearchResult(candidates=candidates, continuation_token="more_token")

        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = json.dumps([
            {"video_id": "clean_vid01", "match_score": 90, "topic_tag": "#Backend", "why_you_care": "Why", "time_roi_hint": "Hint"}
        ])
        mock_client.models.generate_content.return_value = mock_resp

        # Call with Layer 3 dismissed_ids
        res = triage_radar_videos(
            query="Python",
            dismissed_ids=["dismissed01"],
            client=mock_client,
        )

        assert res.success is True
        returned_ids = [v.video_id for v in res.videos]

        # Verify Layer 1 eliminated
        assert "in_vault_001" not in returned_ids
        # Verify Layer 3 eliminated
        assert "dismissed01" not in returned_ids
        # Only up to 6 clean videos triaged
        assert len(returned_ids) == 6
        assert "clean_vid01" in returned_ids
        assert res.has_more is True
        assert res.search_id is not None

        # Verify buffer exists
        buf = get_radar_buffer(res.search_id)
        assert buf is not None
        assert len(buf.unprocessed_candidates) == 1
        assert buf.unprocessed_candidates[0].video_id == "buffer_vid1"

    @patch("app.features.video_curator.services.radar_service.search_candidate_videos")
    @patch("app.features.video_curator.services.radar_service.get_vault_video_ids")
    def test_buffer_pagination_load_more(self, mock_vault_ids, mock_search):
        mock_vault_ids.return_value = set()

        candidates = [make_candidate(f"vid_{i:02d}", f"Video {i}") for i in range(12)]
        mock_search.return_value = RadarSearchResult(candidates=candidates, continuation_token=None)

        mock_client = MagicMock()
        mock_resp = MagicMock()
        mock_resp.text = json.dumps([])
        mock_client.models.generate_content.return_value = mock_resp

        # First batch (0-5)
        res1 = triage_radar_videos(query="FastAPI", client=mock_client)
        assert res1.total_evaluated == 6
        assert res1.has_more is True
        search_id = res1.search_id

        # Second batch via search_id (6-11)
        res2 = triage_radar_videos(search_id=search_id, client=mock_client)
        assert res2.total_evaluated == 6
        assert res2.has_more is False  # No more left in buffer and no continuation token
        assert res2.videos[0].video_id == "vid_06"
