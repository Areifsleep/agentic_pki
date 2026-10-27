"""Centralized GenAI Client Provider & Configuration.

Manages instantiation of the official google-genai SDK Client using application settings.
"""

from typing import Optional
from google import genai

from app.core.config import settings
from app.core.errors import LLMServiceError


def get_genai_client(api_key: Optional[str] = None) -> genai.Client:
    """Instantiates a google-genai Client using configured settings or custom key.

    Args:
        api_key: Optional custom Gemini API key.

    Returns:
        Configured genai.Client instance.

    Raises:
        LLMServiceError: If GEMINI_API_KEY is not configured.
    """
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        raise LLMServiceError(
            "GEMINI_API_KEY belum dikonfigurasi. Harap isi GEMINI_API_KEY pada berkas .env Anda."
        )
    return genai.Client(api_key=key)
