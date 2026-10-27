"""FastAPI APIRouter for Video Curator & Obsidian Vault Features.

Exposes endpoints for video processing, review-first synthesis, in-memory Q&A,
and local Obsidian Vault interactions.
"""

from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings, update_vault_config
from app.features.video_curator.schemas import (
    FocusTargetConfig,
    FocusTargetResponse,
    ProcessVideoRequest,
    ProcessVideoResponse,
    RadarDiscoverRequest,
    RadarDiscoverResponse,
    SaveVaultRequest,
    SaveVaultResponse,
    SynthesizeVideoResponse,
    UpdateVaultSettingsRequest,
    VaultChatRequest,
    VaultChatResponse,
    VaultNotesResponse,
    VaultSettingsResponse,
    VideoQARequest,
    VideoQAResponse,
)
from app.features.video_curator.service import (
    answer_vault_chat,
    answer_video_question,
    generate_topic_query_variations,
    list_vault_notes,
    process_video_curation,
    synthesize_video_pipeline,
    triage_radar_videos,
)
from app.features.video_curator.tools.obsidian_tool import (
    get_focus_targets,
    save_focus_targets,
    save_markdown_to_vault,
)

router = APIRouter(prefix="/api/v1/video", tags=["Video Curator"])
vault_router = APIRouter(prefix="/api/v1/vault", tags=["Obsidian Vault"])
focus_router = APIRouter(prefix="/api/v1/focus", tags=["Focus Studio"])
radar_router = APIRouter(prefix="/api/v1/radar", tags=["Learning Radar"])


@router.post(
    "/process",
    response_model=ProcessVideoResponse,
    status_code=status.HTTP_200_OK,
    summary="Kurasi & Rangkum Video ke Obsidian Vault (Langsung)",
    description=(
        "Mengekstrak transkrip YouTube, merangkum konten menggunakan Gemini AI "
        "sesuai konfigurasi parameter, dan menyimpan berkas Markdown langsung ke "
        "subfolder kategori di Obsidian Vault lokal."
    ),
)
def process_video(payload: ProcessVideoRequest) -> ProcessVideoResponse:
    """Endpoint untuk kurasi video YouTube dan persistensi file Obsidian langsung."""
    return process_video_curation(request=payload)


@router.post(
    "/synthesize",
    response_model=SynthesizeVideoResponse,
    status_code=status.HTTP_200_OK,
    summary="Sintesis Materi Video (Review-First, Tanpa Simpan Fisik)",
    description=(
        "Mengekstrak transkrip YouTube, merangkum materi dengan Gemini AI, "
        "dan mengembalikan konten Markdown untuk ditinjau tanpa menulis ke disk."
    ),
)
def synthesize_video(payload: ProcessVideoRequest) -> SynthesizeVideoResponse:
    """Endpoint sintesis materi in-memory untuk alur review-first."""
    return synthesize_video_pipeline(request=payload)


@router.post(
    "/qa",
    response_model=VideoQAResponse,
    status_code=status.HTTP_200_OK,
    summary="Ask & Jump Q&A Berbasis Transkrip In-Memory",
    description=(
        "Menjawab pertanyaan spesifik mengenai isi materi video aktif "
        "berdasarkan transkrip di memori tanpa memuat ulang video."
    ),
)
async def video_qa(payload: VideoQARequest) -> VideoQAResponse:
    """Endpoint untuk sesi tanya-jawab interaktif berbasis video aktif."""
    return answer_video_question(
        video_id=payload.video_id,
        question=payload.question,
    )


@vault_router.post(
    "/save",
    response_model=SaveVaultResponse,
    status_code=status.HTTP_200_OK,
    summary="Simpan Catatan ke Obsidian Vault Lokal",
    description="Menuliskan berkas catatan markdown ke subfolder kategori di Obsidian Vault lokal.",
)
def save_vault_note(payload: SaveVaultRequest) -> SaveVaultResponse:
    """Persistensi berkas markdown yang telah ditinjau ke Obsidian Vault."""
    res = save_markdown_to_vault(
        vault_path=settings.curator_vault_path,
        category=payload.category,
        title=payload.title,
        content=payload.content,
        video_id=payload.video_id,
        transcript_text=payload.transcript_text,
        index_summary=payload.index_summary,
        tags=payload.tags,
    )
    return SaveVaultResponse(
        success=True,
        file_name=res.file_name,
        file_path=str(res.file_path),
        category=res.category,
        bytes_written=res.bytes_written,
        message="Catatan berhasil diarsipkan ke Obsidian Vault.",
    )


@vault_router.get(
    "/settings",
    response_model=VaultSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Ambil Konfigurasi Obsidian Vault",
    description="Mengambil informasi konfigurasi direktori Obsidian Vault dan subfolder kurator saat ini.",
)
def get_vault_settings() -> VaultSettingsResponse:
    """Membaca path vault aktif dan status keberadaannya di disk."""
    vault_dir = Path(settings.OBSIDIAN_VAULT_PATH).expanduser().resolve()
    curator_dir = settings.curator_vault_path
    notes = list_vault_notes(curator_dir)
    return VaultSettingsResponse(
        success=True,
        vault_path=str(settings.OBSIDIAN_VAULT_PATH),
        curator_folder_name=settings.CURATOR_FOLDER_NAME,
        curator_vault_path=str(curator_dir),
        exists=vault_dir.exists(),
        writable=True,
        total_notes=len(notes),
        message="Konfigurasi Obsidian Vault berhasil diambil.",
    )


@vault_router.post(
    "/settings",
    response_model=VaultSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Perbarui Konfigurasi Lokasi Obsidian Vault",
    description="Mengubah lokasi root Obsidian Vault dan subfolder kurator secara dinamis dan persisten.",
)
def update_vault_settings(payload: UpdateVaultSettingsRequest) -> VaultSettingsResponse:
    """Mengubah konfigurasi path Obsidian Vault dari UI."""
    try:
        res = update_vault_config(
            vault_path=payload.vault_path,
            curator_folder_name=payload.curator_folder_name,
        )
        curator_dir = settings.curator_vault_path
        notes = list_vault_notes(curator_dir)
        return VaultSettingsResponse(
            success=True,
            vault_path=res["vault_path"],
            curator_folder_name=res["curator_folder_name"],
            curator_vault_path=res["curator_vault_path"],
            exists=Path(res["vault_path"]).exists(),
            writable=True,
            total_notes=len(notes),
            message="Lokasi Obsidian Vault berhasil diperbarui.",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Gagal mengatur lokasi Obsidian Vault: {str(exc)}",
        ) from exc


@vault_router.get(
    "/notes",
    response_model=VaultNotesResponse,
    status_code=status.HTTP_200_OK,
    summary="Daftar Catatan di Obsidian Vault",
    description="Mengambil daftar seluruh berkas markdown yang tersimpan di direktori Obsidian Vault.",
)
def get_vault_notes() -> VaultNotesResponse:
    """Mengembalikan daftar catatan lokal untuk tampilan Riwayat Vault."""
    notes = list_vault_notes(settings.curator_vault_path)
    return VaultNotesResponse(
        success=True,
        notes=notes,
        total=len(notes),
    )


@vault_router.get(
    "/note",
    status_code=status.HTTP_200_OK,
    summary="Baca Konten Catatan dari Obsidian Vault",
    description="Membaca teks berkas markdown berdasarkan absolute path di direktori vault.",
)
def get_vault_note_content(path: str = Query(..., description="Absolute path file markdown")):
    """Membaca isi berkas catatan lokal."""
    file_path = Path(path).resolve()
    vault_root = Path(settings.curator_vault_path).expanduser().resolve()
    # Security check: must reside inside obsidian vault
    if not str(file_path).startswith(str(vault_root)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Berkas berada di luar batas Obsidian Vault yang diizinkan.",
        )
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Berkas catatan tidak ditemukan di Obsidian Vault.",
        )
    content = file_path.read_text(encoding="utf-8")
    return {
        "success": True,
        "file_name": file_path.name,
        "title": file_path.stem.replace("-", " ").capitalize(),
        "file_path": str(file_path),
        "content": content,
    }


@vault_router.post(
    "/chat",
    response_model=VaultChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Dialog Lintas Catatan Vault (2-Stage Router RAG)",
    description="Menjawab pertanyaan global pengguna berbasis katalog vault_index.json dan dokumen catatan lokal.",
)
def chat_vault(payload: VaultChatRequest) -> VaultChatResponse:
    """Endpoint untuk RAG multi-catatan menggunakan 2-stage hierarchical router."""
    return answer_vault_chat(question=payload.question)


@focus_router.get(
    "",
    response_model=FocusTargetResponse,
    status_code=status.HTTP_200_OK,
    summary="Ambil Target Belajar dari my_focus.md",
    description="Membaca konfigurasi pilar topik dan sasaran belajar pengguna dari berkas lokal my_focus.md.",
)
def get_focus() -> FocusTargetResponse:
    """Mengembalikan konfigurasi target belajar aktif."""
    data = get_focus_targets(settings.curator_vault_path)
    return FocusTargetResponse(
        success=True,
        topics=data.get("topics", []),
        depth_preset=data.get("depth_preset", "deepdive"),
        anti_goals=data.get("anti_goals", []),
        query_variations=data.get("query_variations", {}),
        raw_markdown=data.get("raw_markdown", ""),
        is_custom=data.get("is_custom", False),
    )


@focus_router.post(
    "",
    response_model=FocusTargetResponse,
    status_code=status.HTTP_200_OK,
    summary="Simpan Target Belajar ke my_focus.md",
    description="Menyimpan atau memperbarui berkas my_focus.md secara fisik di root Obsidian Vault.",
)
def update_focus(payload: FocusTargetConfig) -> FocusTargetResponse:
    """Menulis konfigurasi target belajar ke my_focus.md."""
    # Pre-compute query variations if not provided and topics exist
    vars_to_save = payload.query_variations
    if not vars_to_save and payload.topics:
        try:
            vars_to_save = generate_topic_query_variations(
                topics=payload.topics,
                depth_preset=payload.depth_preset,
            )
        except Exception:
            vars_to_save = {}

    data_to_save = payload.model_dump()
    data_to_save["query_variations"] = vars_to_save

    res = save_focus_targets(settings.curator_vault_path, data_to_save)
    return FocusTargetResponse(
        success=True,
        topics=res.get("topics", []),
        depth_preset=res.get("depth_preset", "deepdive"),
        anti_goals=res.get("anti_goals", []),
        query_variations=res.get("query_variations", {}),
        raw_markdown=res.get("raw_markdown", ""),
        file_path=res.get("file_path"),
        is_custom=True,
    )


@focus_router.post(
    "/variations",
    status_code=status.HTTP_200_OK,
    summary="Pre-komputasi Variasi Kueri YouTube via Gemini",
    description="Menghasilkan variasi kata kunci YouTube untuk pilar topik agar pencarian radar kaya variasi tanpa latensi on-the-fly.",
)
def generate_variations(payload: FocusTargetConfig):
    """Menghasilkan variasi kueri eksplorasi secara offline/asinkron."""
    variations = generate_topic_query_variations(
        topics=payload.topics,
        depth_preset=payload.depth_preset,
    )
    return {"success": True, "variations": variations}


@radar_router.post(
    "/discover",
    response_model=RadarDiscoverResponse,
    status_code=status.HTTP_200_OK,
    summary="Autonomous Learning Radar (Scrape Wide & Lazy Micro-Triage)",
    description="Menemukan video YouTube kandidat secara deterministik (24 item), deduplikasi 3-layer, dan batch micro-triage per 6 video.",
)
def discover_radar(payload: RadarDiscoverRequest) -> RadarDiscoverResponse:
    """Pencarian video cerdas berdasarkan pilar minat target belajar."""
    return triage_radar_videos(
        query=payload.query,
        sort_by=payload.sort_by,
        search_id=payload.search_id,
        dismissed_ids=payload.dismissed_ids,
    )
