"""Deterministic YouTube Discovery Tool for Autonomous Learning Radar (Level 2 Tool).

Scrapes/extracts candidate video metadata deterministically without paid API keys,
applies local duration heuristic filters (rejecting Shorts <2m and marathons >240m),
supports YouTube sort parameters (relevance, latest, most_viewed), extracts
native continuation tokens for zero-token pagination, and prepares high-density
metadata for Batch Micro-Triage.
"""

from dataclasses import dataclass, field
import json
import re
from typing import List, Optional, Tuple, Union
import urllib.parse
import urllib.request


@dataclass
class CandidateVideo:
    video_id: str
    title: str
    channel: str
    duration_str: str
    duration_minutes: float
    description: str
    thumbnail_url: str


@dataclass
class RadarSearchResult:
    """Encapsulates scraped candidates and the native continuation token for next-page pagination."""

    candidates: List[CandidateVideo] = field(default_factory=list)
    continuation_token: Optional[str] = None

    def __iter__(self):
        return iter(self.candidates)

    def __len__(self):
        return len(self.candidates)

    def __getitem__(self, index):
        return self.candidates[index]


# YouTube sort parameters ('sp')
SORT_PARAMS = {
    "relevance": None,
    "latest": "CAISAhAB",
    "most_viewed": "CAMSAhAB",
}

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
}


def parse_duration_to_minutes(duration_str: str) -> float:
    """Parses duration strings like '15:16', '15.16', '1:04:33' into total minutes."""
    cleaned = duration_str.replace(".", ":").strip()
    parts = cleaned.split(":")
    try:
        if len(parts) == 1:
            return float(parts[0]) / 60.0
        elif len(parts) == 2:
            return float(parts[0]) + (float(parts[1]) / 60.0)
        elif len(parts) == 3:
            return (float(parts[0]) * 60.0) + float(parts[1]) + (float(parts[2]) / 60.0)
    except Exception:
        pass
    return 10.0  # Safe fallback


def _parse_video_renderer(v: dict) -> Optional[CandidateVideo]:
    """Extracts CandidateVideo from a single YouTube videoRenderer dict."""
    vid = v.get("videoId")
    if not vid or len(vid) != 11:
        return None

    title_runs = v.get("title", {}).get("runs", [])
    title = title_runs[0].get("text", "") if title_runs else ""
    if not title:
        return None

    dur_str = v.get("lengthText", {}).get("simpleText", "")
    if not dur_str:
        return None  # Skip live streams or premiere placeholders without lengthText

    dur_mins = parse_duration_to_minutes(dur_str)

    # Heuristic filter: Reject Shorts (<2m) and massive marathons (>240m / 4 hours)
    if dur_mins < 2.0 or dur_mins > 240.0:
        return None

    # Channel
    channel_runs = v.get("ownerText", {}).get("runs", [])
    channel = channel_runs[0].get("text", "YouTube Creator") if channel_runs else "YouTube Creator"

    # Snippet Description
    desc = ""
    snippets = v.get("detailedMetadataSnippets", [])
    if snippets:
        desc_runs = snippets[0].get("snippetText", {}).get("runs", [])
        desc = "".join(r.get("text", "") for r in desc_runs)
    elif "descriptionSnippet" in v:
        desc_runs = v.get("descriptionSnippet", {}).get("runs", [])
        desc = "".join(r.get("text", "") for r in desc_runs)

    thumb = f"https://img.youtube.com/vi/{vid}/hqdefault.jpg"

    return CandidateVideo(
        video_id=vid,
        title=title,
        channel=channel,
        duration_str=dur_str,
        duration_minutes=round(dur_mins, 1),
        description=desc[:350].strip(),
        thumbnail_url=thumb,
    )


def extract_continuation_token(data: dict) -> Optional[str]:
    """Recursively locates continuation token in ytInitialData or Innertube JSON."""
    try:
        sections = (
            data.get("contents", {})
            .get("twoColumnSearchResultsRenderer", {})
            .get("primaryContents", {})
            .get("sectionListRenderer", {})
            .get("contents", [])
        )
        for sec in sections:
            if "continuationItemRenderer" in sec:
                endpoint = sec["continuationItemRenderer"].get("continuationEndpoint", {})
                tok = endpoint.get("continuationCommand", {}).get("token")
                if tok:
                    return str(tok)

            items = sec.get("itemSectionRenderer", {}).get("contents", [])
            for it in items:
                if "continuationItemRenderer" in it:
                    endpoint = it["continuationItemRenderer"].get("continuationEndpoint", {})
                    tok = endpoint.get("continuationCommand", {}).get("token")
                    if tok:
                        return str(tok)

        # Check in onResponseReceivedCommands (for continuation responses)
        commands = data.get("onResponseReceivedCommands", [])
        for cmd in commands:
            action = cmd.get("appendContinuationItemsAction", {})
            c_items = action.get("continuationItems", [])
            for it in c_items:
                if "continuationItemRenderer" in it:
                    endpoint = it["continuationItemRenderer"].get("continuationEndpoint", {})
                    tok = endpoint.get("continuationCommand", {}).get("token")
                    if tok:
                        return str(tok)
    except Exception:
        pass
    return None


def search_candidate_videos_with_continuation(
    query: str,
    max_candidates: int = 24,
    sort_by: str = "relevance",
    timeout_seconds: int = 10,
) -> RadarSearchResult:
    """Searches YouTube deterministically, returning up to max_candidates (Scrape Wide)

    and extracting the native YouTube continuation token for pagination.
    """
    cleaned_query = query.strip()
    if not cleaned_query:
        cleaned_query = "Python Architecture and Modern Engineering"

    url = f"https://www.youtube.com/results?search_query={urllib.parse.quote(cleaned_query)}"
    sp_val = SORT_PARAMS.get(sort_by)
    if sp_val:
        url += f"&sp={sp_val}"

    try:
        req = urllib.request.Request(url, headers=DEFAULT_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            html = resp.read().decode("utf-8", errors="ignore")
    except Exception:
        return RadarSearchResult()

    # Extract ytInitialData
    data = None
    match = re.search(r"var ytInitialData = ({.*?});</script>", html)
    if not match:
        match = re.search(r"ytInitialData\s*=\s*({.+?});", html)

    if match:
        try:
            data = json.loads(match.group(1))
        except Exception:
            data = None

    if not data:
        return RadarSearchResult()

    candidates: List[CandidateVideo] = []
    seen_ids = set()

    sections = (
        data.get("contents", {})
        .get("twoColumnSearchResultsRenderer", {})
        .get("primaryContents", {})
        .get("sectionListRenderer", {})
        .get("contents", [])
    )

    for sec in sections:
        items = sec.get("itemSectionRenderer", {}).get("contents", [])
        for it in items:
            v = it.get("videoRenderer")
            if not v:
                continue

            candidate = _parse_video_renderer(v)
            if not candidate or candidate.video_id in seen_ids:
                continue

            seen_ids.add(candidate.video_id)
            candidates.append(candidate)

            if len(candidates) >= max_candidates:
                break

        if len(candidates) >= max_candidates:
            break

    continuation_token = extract_continuation_token(data)

    return RadarSearchResult(
        candidates=candidates,
        continuation_token=continuation_token,
    )


def search_candidate_videos(
    query: str,
    max_candidates: int = 24,
    sort_by: str = "relevance",
    timeout_seconds: int = 10,
) -> RadarSearchResult:
    """Deterministic YouTube search returning RadarSearchResult (iterable of candidates + continuation_token)."""
    return search_candidate_videos_with_continuation(
        query=query,
        max_candidates=max_candidates,
        sort_by=sort_by,
        timeout_seconds=timeout_seconds,
    )


def fetch_continuation_candidates(
    continuation_token: str,
    max_candidates: int = 24,
    timeout_seconds: int = 10,
) -> RadarSearchResult:
    """Fetches the next page of candidate videos using YouTube's native continuation token

    via Innertube API endpoint (0 AI token cost).
    """
    if not continuation_token:
        return RadarSearchResult()

    endpoint = "https://www.youtube.com/youtubei/v1/search?prettyPrint=false"
    payload = {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": "2.20240301.00.00",
                "hl": "en",
                "gl": "US",
            }
        },
        "continuation": continuation_token,
    }

    headers = {
        **DEFAULT_HEADERS,
        "Content-Type": "application/json",
    }

    try:
        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(endpoint, data=data_bytes, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            resp_json = json.loads(resp.read().decode("utf-8", errors="ignore"))
    except Exception:
        return RadarSearchResult()

    candidates: List[CandidateVideo] = []
    seen_ids = set()

    commands = resp_json.get("onResponseReceivedCommands", [])
    for cmd in commands:
        action = cmd.get("appendContinuationItemsAction", {})
        c_items = action.get("continuationItems", [])
        for it in c_items:
            # Check direct itemSectionRenderer
            section_items = it.get("itemSectionRenderer", {}).get("contents", [])
            items_to_check = section_items if section_items else [it]

            for entry in items_to_check:
                v = entry.get("videoRenderer")
                if not v:
                    continue
                candidate = _parse_video_renderer(v)
                if not candidate or candidate.video_id in seen_ids:
                    continue
                seen_ids.add(candidate.video_id)
                candidates.append(candidate)
                if len(candidates) >= max_candidates:
                    break

            if len(candidates) >= max_candidates:
                break

    next_token = extract_continuation_token(resp_json)

    return RadarSearchResult(
        candidates=candidates,
        continuation_token=next_token,
    )
