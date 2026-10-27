"""Focus Studio Query Variations Pre-Computation Service.

Uses Gemini to generate 4-6 specific search query variations per topic pillar once
when targets are saved in Focus Studio (my_focus.md), preventing latency chaining
during on-the-fly radar searches.
"""

import json
from typing import Dict, List, Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.features.video_curator.services.llm_client import get_genai_client
from app.features.video_curator.services.prompts import build_focus_variations_prompt


def generate_topic_query_variations(
    topics: List[str],
    depth_preset: str = "deepdive",
    client: Optional[genai.Client] = None,
) -> Dict[str, List[str]]:
    """Generates 4-6 high-yield YouTube search variations for each topic pillar.

    Args:
        topics: List of topic pillar names.
        depth_preset: Learning depth preset (cheatsheet, deepdive, code_action).
        client: Optional Gemini client.

    Returns:
        Dict mapping topic pillar name to list of query variations.
    """
    if not topics:
        return {}

    prompt = build_focus_variations_prompt(topics=topics, depth_preset=depth_preset)
    gen_client = client or get_genai_client()

    try:
        response = gen_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.4,
            ),
        )
        response_text = response.text or "{}"
        parsed = json.loads(response_text)

        variations_data = parsed.get("variations", {})
        if isinstance(variations_data, dict):
            return {
                str(k): [str(v).strip() for v in val if v]
                for k, val in variations_data.items()
                if isinstance(val, list)
            }
    except Exception:
        pass

    # Deterministic fallback variations if model unavailable
    fallback = {}
    for t in topics:
        clean_t = t.strip().lstrip("#")
        fallback[clean_t] = [
            f"{clean_t} architecture deep dive",
            f"{clean_t} best practices and design patterns",
            f"{clean_t} practical production tutorial",
        ]
    return fallback
