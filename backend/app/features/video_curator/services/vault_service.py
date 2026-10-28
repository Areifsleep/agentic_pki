"""Obsidian Vault File Scanning & 2-Stage Hierarchical Router RAG Service.

Implements zero-vector-DB multi-note knowledge synthesis directly using local
markdown files as Single Source of Truth.
"""

from datetime import datetime
import json
from pathlib import Path
from typing import Optional
from google import genai
from google.genai import types

from app.core.config import settings
from app.core.errors import LLMServiceError
from app.features.video_curator.schemas import (
    VaultChatResponse,
    VaultNoteItem,
    VaultRouterSchema,
)
from app.features.video_curator.services.llm_client import get_genai_client
from app.features.video_curator.services.prompts import (
    build_vault_router_prompt,
    build_vault_synthesis_prompt,
)
from app.features.video_curator.tools.obsidian_tool import get_vault_index


def list_vault_notes(vault_path: Optional[str] = None) -> list[VaultNoteItem]:
    """Scans Obsidian Vault directory for all markdown notes using pathlib (Zero ORM).

    Args:
        vault_path: Optional custom vault root path, default from settings.

    Returns:
        List of VaultNoteItem sorted newest to oldest.
    """
    base_dir = Path(vault_path or settings.curator_vault_path).expanduser().resolve()
    if not base_dir.exists() or not base_dir.is_dir():
        return []

    notes: list[VaultNoteItem] = []
    for md_file in base_dir.rglob("*.md"):
        if not md_file.is_file() or md_file.name.startswith("."):
            continue
        try:
            relative_parent = md_file.parent.relative_to(base_dir)
            category = str(relative_parent) if str(relative_parent) != "." else "General"
            title = md_file.stem.replace("-", " ").capitalize()
            mtime = datetime.fromtimestamp(md_file.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
            notes.append(
                VaultNoteItem(
                    file_name=md_file.name,
                    category=category,
                    title=title,
                    file_path=str(md_file),
                    modified_at=mtime,
                )
            )
        except Exception:
            continue

    notes.sort(key=lambda n: n.modified_at, reverse=True)
    return notes


def answer_vault_chat(
    question: str,
    client: Optional[genai.Client] = None,
) -> VaultChatResponse:
    """Answers a user query using 2-Stage Hierarchical Router RAG across Obsidian Vault.

    Stage 1: Sends question + vault_index.json summaries to select relevant files (~800 tokens).
    Stage 2: Reads full selected files from disk and synthesizes grounded answer with citations.
    """
    index_items = get_vault_index(settings.curator_vault_path)
    if not index_items:
        # Rebuild index from existing files if index file was empty
        all_notes = list_vault_notes(settings.curator_vault_path)
        if not all_notes:
            return VaultChatResponse(
                success=True,
                answer="Belum ada catatan yang tersimpan di Obsidian Vault Anda. Kurasi beberapa video terlebih dahulu untuk membuka dialog multi-catatan.",
                cited_files=[],
                routed_count=0,
            )
        index_items = [
            {
                "file_path": n.file_path,
                "title": n.title,
                "category": n.category,
                "tags": [n.category.lower()],
                "summary": f"Catatan mengenai {n.title} dalam kategori {n.category}.",
            }
            for n in all_notes[:30]
        ]

    gen_client = client or get_genai_client()

    # Stage 1: Router
    catalog_summary = "\n".join(
        f"- file_path: {item.get('file_path')}\n"
        f"  title: {item.get('title')}\n"
        f"  category: {item.get('category')}\n"
        f"  summary: {item.get('summary')}"
        for item in index_items[:40]
    )

    router_prompt = build_vault_router_prompt(catalog_summary, question)

    selected_files: list[str] = []
    try:
        r_resp = gen_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=router_prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=VaultRouterSchema,
                temperature=0.1,
            ),
        )
        r_text = (r_resp.text or "").strip()
        if r_text.startswith("```json"):
            r_text = r_text[7:].strip()
        elif r_text.startswith("```"):
            r_text = r_text[3:].strip()
        if r_text.endswith("```"):
            r_text = r_text[:-3].strip()

        r_parsed = json.loads(r_text or "{}", strict=False)
        if isinstance(r_parsed, dict) and "selected_files" in r_parsed:
            selected_files = [str(f) for f in r_parsed["selected_files"] if f]
    except Exception:
        # Default fallback to first file
        selected_files = [index_items[0].get("file_path", "")] if index_items else []

    # Stage 2: Grounded Synthesis
    # Detect if user query requires timestamp or dialogue-level grounding
    needs_transcript = any(
        kw in question.lower()
        for kw in ["menit", "detik", "timestamp", "transkrip", "transcript", "dialog", "pembicara", "kutipan", "waktu"]
    )

    # Filter valid existing files
    base_vault = Path(settings.curator_vault_path).expanduser().resolve()
    valid_contents: list[tuple[str, str]] = []

    # Map paths to index items for transcript lookup
    index_map: dict[str, dict] = {}
    for item in index_items:
        if isinstance(item, dict):
            fp = item.get("file_path")
            if fp:
                index_map[str(fp)] = item
                index_map[Path(fp).name] = item

    for f_path in selected_files:
        p = Path(f_path)
        if not p.is_absolute():
            p = base_vault / f_path
        if p.exists() and p.is_file():
            try:
                note_text = p.read_text(encoding="utf-8")[:6000]
                doc_text = note_text

                # Selectively append raw transcript with timestamps if query asks for dialogue/timestamps
                if needs_transcript:
                    rel_p = str(p.relative_to(base_vault)) if p.is_relative_to(base_vault) else p.name
                    matched_item = index_map.get(str(p)) or index_map.get(rel_p) or index_map.get(p.name)
                    trans_rel = matched_item.get("transcript_path") if matched_item else None
                    trans_file = None
                    if trans_rel:
                        trans_file = base_vault / trans_rel
                    elif matched_item and matched_item.get("video_id"):
                        trans_file = base_vault / "_transcripts" / f"{matched_item.get('video_id')}.txt"

                    if trans_file and trans_file.exists():
                        trans_content = trans_file.read_text(encoding="utf-8")[:8000]
                        doc_text += f"\n\n### RAW TRANSCRIPT (TIMESTAMPS):\n{trans_content}"

                valid_contents.append((p.name, doc_text))
            except Exception:
                continue

    if not valid_contents:
        return VaultChatResponse(
            success=True,
            answer="Tidak ditemukan catatan di Obsidian Vault yang relevan dengan pertanyaan tersebut.",
            cited_files=[],
            routed_count=0,
        )

    # Stage 2: Grounded Synthesis
    docs_text = "\n\n---\n\n".join(
        f"DOCUMENT: {name}\n{txt}" for name, txt in valid_contents
    )

    synthesis_prompt = build_vault_synthesis_prompt(docs_text, question)

    try:
        synth_resp = gen_client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=synthesis_prompt,
            config=types.GenerateContentConfig(temperature=0.2),
        )
        answer_text = synth_resp.text or "Maaf, tidak dapat menghasilkan jawaban."
    except Exception as exc:
        raise LLMServiceError(f"Gagal melakukan sintesis grounded RAG: {str(exc)}") from exc

    cited_names = [name for name, _ in valid_contents]
    return VaultChatResponse(
        success=True,
        answer=answer_text.strip(),
        cited_files=cited_names,
        routed_count=len(cited_names),
    )
