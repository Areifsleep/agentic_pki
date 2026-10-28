"""Pydantic v2 Data Transfer Objects (DTOs) for Video Curator feature.

Defines request/response schemas for video processing and in-memory Q&A
in strict accordance with Section 7 of the SRS.
"""

from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, field_validator


class SummaryMode(str, Enum):
    """Summary depth mode for parameterized prompting."""

    CHEATSHEET = "cheatsheet"
    DEEPDIVE = "deepdive"
    CODE_ACTION = "code_action"


class CuratorConfig(BaseModel):
    """Parameterized prompting configuration options."""

    mode: SummaryMode = Field(
        default=SummaryMode.CHEATSHEET,
        description="Depth mode: cheatsheet (Quick Cheat-Sheet), deepdive (Deep Dive / Study Guide), or code_action (Code & Action Only)",
    )
    include_timestamps: bool = Field(
        default=True,
        description="Include timestamp anchors [MM:SS] in the generated markdown",
    )
    include_pitfalls: bool = Field(
        default=True,
        description="Extract and highlight common pitfalls or common mistakes",
    )
    include_code: bool = Field(
        default=True,
        description="Extract and format practical code snippets",
    )
    custom_prompt: Optional[str] = Field(
        default=None,
        description="Optional user custom prompt directive",
    )


class ProcessVideoRequest(BaseModel):
    """Payload for POST /api/v1/video/process."""

    video_url: str = Field(
        ...,
        description="YouTube URL (standard, shortened, shorts, or embed)",
        examples=["https://www.youtube.com/watch?v=kqtD5dpn9C8"],
    )
    config: CuratorConfig = Field(
        default_factory=CuratorConfig,
        description="Summary depth and modifier preferences",
    )

    @field_validator("video_url")
    @classmethod
    def validate_url_not_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("video_url tidak boleh kosong.")
        return cleaned


class ProcessVideoResponse(BaseModel):
    """Response payload for successful video curation."""

    success: bool = Field(default=True)
    video_id: str = Field(..., description="11-character YouTube video ID")
    category: str = Field(..., description="Auto-classified domain subfolder")
    video_title: str = Field(..., description="Cleaned title of the note")
    file_name: str = Field(..., description="Markdown filename inside category folder")
    file_path: str = Field(..., description="Full absolute path on local file system")
    markdown_content: str = Field(..., description="Generated markdown document")
    execution_time_seconds: float = Field(..., description="Total pipeline execution duration in seconds")
    message: str = Field(
        default="Catatan berhasil dirangkum dan disimpan ke subfolder kategori Obsidian.",
        description="Status message",
    )


class SynthesizeVideoResponse(BaseModel):
    """Response payload for in-memory video synthesis (Review-First, without disk write)."""

    success: bool = Field(default=True)
    video_id: str = Field(..., description="11-character YouTube video ID")
    category: str = Field(..., description="Auto-classified domain subfolder")
    video_title: str = Field(..., description="Cleaned title of the note")
    index_summary: Optional[str] = Field(default=None, description="1-2 sentences conceptual summary for vault catalog")
    tags: list[str] = Field(default_factory=list, description="Categorized topic tags")
    transcript_text: Optional[str] = Field(default=None, description="Raw formatted transcript with timestamps")
    markdown_content: str = Field(..., description="Generated markdown document")
    execution_time_seconds: float = Field(..., description="Total pipeline execution duration in seconds")
    message: str = Field(
        default="Materi berhasil dirangkum dan siap ditinjau sebelum disimpan.",
        description="Status message",
    )


class SaveVaultRequest(BaseModel):
    """Payload for POST /api/v1/vault/save."""

    category: str = Field(..., description="Subfolder domain name")
    title: str = Field(..., description="Note title for filename generation")
    content: str = Field(..., description="Markdown body to write into file")
    video_id: Optional[str] = Field(default=None, description="Optional video ID for raw transcript archiving")
    transcript_text: Optional[str] = Field(default=None, description="Optional raw transcript text")
    index_summary: Optional[str] = Field(default=None, description="Optional structured index summary")
    tags: list[str] = Field(default_factory=list, description="Optional tags list")

    @field_validator("content")
    @classmethod
    def validate_content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("content catatan tidak boleh kosong.")
        return v


class SaveVaultResponse(BaseModel):
    """Response payload for POST /api/v1/vault/save."""

    success: bool = Field(default=True)
    file_name: str = Field(..., description="Persisted filename in vault")
    file_path: str = Field(..., description="Absolute path on disk")
    category: str = Field(..., description="Category subfolder")
    bytes_written: int = Field(..., description="Total bytes written")
    message: str = Field(
        default="Catatan berhasil diarsipkan ke Obsidian Vault.",
        description="Status message",
    )


class VaultNoteItem(BaseModel):
    """Metadata item for notes stored in Obsidian Vault."""

    file_name: str
    category: str
    title: str
    file_path: str
    modified_at: str


class VaultNotesResponse(BaseModel):
    """List of all markdown notes stored in Obsidian Vault."""

    success: bool = Field(default=True)
    notes: list[VaultNoteItem] = Field(default_factory=list)
    total: int = 0


class VaultSettingsResponse(BaseModel):
    """Response payload for GET/POST /api/v1/vault/settings."""

    success: bool = Field(default=True)
    vault_path: str = Field(..., description="Root Obsidian Vault directory path")
    curator_folder_name: str = Field(..., description="Subfolder dedicated to Curator notes")
    curator_vault_path: str = Field(..., description="Full workspace directory path")
    exists: bool = Field(..., description="Whether the vault directory exists on disk")
    writable: bool = Field(default=True, description="Whether the directory is writable")
    total_notes: int = Field(default=0, description="Total notes currently stored in curator vault")
    message: Optional[str] = Field(default=None, description="Optional status message")


class UpdateVaultSettingsRequest(BaseModel):
    """Payload for POST /api/v1/vault/settings."""

    vault_path: str = Field(..., description="Root directory path for Obsidian Vault")
    curator_folder_name: Optional[str] = Field(
        default=None,
        description="Optional custom subfolder name (defaults to current setting)",
    )

    @field_validator("vault_path")
    @classmethod
    def validate_path_not_empty(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("vault_path tidak boleh kosong.")
        return cleaned



# Focus Studio Schemas (my_focus.md Grounding)
class NoteSynthesisSchema(BaseModel):
    """Schema for Gemini Structured Output constrained decoding in video note synthesis."""

    category: str = Field(description="Format Domain/Subdomain misal: 'Backend/FastAPI'")
    video_title: str = Field(description="Judul Catatan yang Informatif dan Bersih")
    index_summary: str = Field(
        description="1-2 kalimat padat konseptual yang merangkum inti materi untuk katalog vault"
    )
    tags: list[str] = Field(
        default_factory=list, description="Daftar tag topik relevan huruf kecil"
    )
    markdown_content: str = Field(
        description="Isi lengkap dokumen markdown termasuk YAML frontmatter"
    )


class VideoQASchema(BaseModel):
    """Schema for Gemini Structured Output in Ask & Jump Q&A."""

    answer: str = Field(description="Jawaban to-the-point dalam Bahasa Indonesia")
    timestamp_reference: Optional[str] = Field(
        default=None,
        description="Penanda menit:detik misal '02:15' atau null jika tidak spesifik",
    )


class VaultRouterSchema(BaseModel):
    """Schema for Gemini Structured Output in Stage 1 Router RAG."""

    selected_files: list[str] = Field(
        default_factory=list,
        description="Maksimal 3 berkas catatan yang paling relevan dari katalog vault",
    )


class FocusTargetConfig(BaseModel):
    """Configuration payload for my_focus.md."""

    topics: list[str] = Field(default_factory=list, description="Pillars of user learning interests")
    depth_preset: str = Field(default="deepdive", description="cheatsheet, deepdive, or code_action")
    anti_goals: list[str] = Field(default_factory=list, description="Topics and styles to avoid")
    query_variations: Dict[str, list[str]] = Field(default_factory=dict, description="Pre-computed search variations per topic")


class FocusTargetResponse(BaseModel):
    """Response payload for GET/POST /api/v1/focus."""

    success: bool = Field(default=True)
    topics: list[str] = Field(default_factory=list)
    depth_preset: str = Field(default="deepdive")
    anti_goals: list[str] = Field(default_factory=list)
    query_variations: Dict[str, list[str]] = Field(default_factory=dict)
    raw_markdown: str = ""
    file_path: Optional[str] = None
    is_custom: bool = False


# Autonomous Learning Radar Schemas
class RadarVideoItem(BaseModel):
    """Evaluated video recommendation card."""

    video_id: str
    title: str
    channel: str
    duration_str: str
    thumbnail_url: str
    match_score: int = Field(..., ge=0, le=100, description="Semantic alignment score percentage")
    topic_tag: str = Field(..., description="Target alignment e.g. #Backend")
    difficulty: str = Field(default="Intermediate", description="Beginner, Intermediate, or Advanced")
    why_you_care: str = Field(..., description="1-2 sentences rationalizing value")
    time_roi_hint: str = Field(..., description="Estimated dense segment timestamp e.g. 03:10-14:20")


class RadarDiscoverRequest(BaseModel):
    """Request payload for POST /api/v1/radar/discover."""

    query: Optional[str] = Field(default=None, description="Optional custom query; defaults to my_focus topics")
    sort_by: str = Field(default="relevance", description="Sorting filter: relevance, latest, or most_viewed")
    search_id: Optional[str] = Field(default=None, description="Existing session buffer ID for pagination")
    dismissed_ids: list[str] = Field(default_factory=list, description="IDs to dismiss/ignore")


class RadarDiscoverResponse(BaseModel):
    """Response payload for POST /api/v1/radar/discover."""

    success: bool = Field(default=True)
    videos: list[RadarVideoItem] = Field(default_factory=list)
    query_used: str = ""
    total_evaluated: int = 0
    search_id: Optional[str] = None
    has_more: bool = True
    continuation_available: bool = False


# 2-Stage Hierarchical Router RAG Schemas
class VaultChatRequest(BaseModel):
    """Payload for POST /api/v1/vault/chat."""

    question: str = Field(..., description="User question across entire vault")

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Pertanyaan tidak boleh kosong.")
        return cleaned


class VaultChatResponse(BaseModel):
    """Response payload for POST /api/v1/vault/chat."""

    success: bool = Field(default=True)
    answer: str
    cited_files: list[str] = Field(default_factory=list)
    routed_count: int = 0


class VideoQARequest(BaseModel):
    """Payload for POST /api/v1/video/qa."""

    video_id: str = Field(
        ...,
        description="11-character video ID corresponding to an active video in session",
        examples=["kqtD5dpn9C8"],
    )
    question: str = Field(
        ...,
        description="User question regarding the video transcript",
        examples=["Bagian mana yang menjelaskan beda async def sama def biasa?"],
    )

    @field_validator("video_id")
    @classmethod
    def validate_video_id(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("video_id tidak boleh kosong.")
        return cleaned

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("question tidak boleh kosong.")
        return cleaned


class VideoQAResponse(BaseModel):
    """Response payload for in-memory transcript Q&A."""

    success: bool = Field(default=True)
    answer: str = Field(..., description="Direct answer synthesized from the transcript")
    timestamp_reference: Optional[str] = Field(
        default=None,
        description="Estimated timestamp in MM:SS where the topic is discussed",
    )


class ErrorResponse(BaseModel):
    """Standardized error contract across all endpoints (NFR-04)."""

    success: bool = Field(default=False)
    error: str = Field(..., description="Human-readable error description")
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional diagnostic context or validation errors",
    )