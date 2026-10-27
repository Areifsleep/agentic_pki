"""Deterministic Obsidian Vault File System Tool (Level 2 Agent Tool).

Provides pure Python functions using pathlib to route categories, prevent collisions,
and write physical markdown notes into an Obsidian Vault.
"""

from dataclasses import dataclass
from datetime import datetime
import json
from pathlib import Path
import re
from typing import Any, Dict, List, Optional, Union

from app.core.errors import ObsidianVaultError

# Illegal file system characters on Windows, macOS, and Linux
ILLEGAL_FS_CHARS_REGEX = re.compile(r'[\\/*?:"<>|]')


@dataclass
class ObsidianSaveResult:
    """Represents the outcome of persisting a markdown note to Obsidian Vault."""

    file_path: Path
    file_name: str
    category: str
    bytes_written: int


def sanitize_filename(title: str, max_length: int = 120) -> str:
    """Sanitizes a string to produce a clean, OS-compatible Markdown file name slug.

    Args:
        title: Raw title string (e.g., video title).
        max_length: Maximum allowed length for the file stem.

    Returns:
        A sanitized filename ending with `.md` (e.g. 'async-io-in-fastapi.md').
    """
    if not title or not title.strip():
        title = "untitled-note"

    # Replace illegal filesystem characters and unwanted punctuation with hyphens
    cleaned = ILLEGAL_FS_CHARS_REGEX.sub("-", title.strip())
    # Remove any character that isn't alphanumeric, space, underscore, or hyphen
    cleaned = re.sub(r"[^\w\s-]", "", cleaned)

    # Replace whitespace and repeated punctuation with single hyphens
    cleaned = re.sub(r"[\s_]+", "-", cleaned)
    cleaned = re.sub(r"-+", "-", cleaned)

    # Strip leading/trailing hyphens and dots
    cleaned = cleaned.strip("-.")
    if not cleaned:
        cleaned = "untitled-note"

    # Truncate if too long, avoiding trailing hyphens
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rstrip("-.")

    return f"{cleaned.lower()}.md"


def sanitize_category(category: str) -> str:
    """Sanitizes a category string to ensure it is a valid subfolder name or path.

    Supports hierarchical 'Domain/Subdomain' paths while preventing illegal FS chars.

    Args:
        category: Category name or path (e.g. 'Backend/FastAPI', 'Web / API Design ?').

    Returns:
        Sanitized subfolder directory path (e.g. 'Backend/FastAPI', 'Web - API Design').
    """
    if not category or not category.strip():
        return "General"

    # Replace slash surrounded by spaces with hyphen (e.g. "Web / API" -> "Web - API")
    cleaned = re.sub(r"\s+/\s+", " - ", category.strip())

    # Split by remaining forward or backward slashes to preserve actual hierarchical paths
    parts = [p.strip() for p in re.split(r"[/\\]+", cleaned) if p.strip()]
    clean_parts = []
    for p in parts:
        seg = ILLEGAL_FS_CHARS_REGEX.sub("-", p)
        seg = re.sub(r"-+", "-", seg)
        seg = re.sub(r"\s+", " ", seg)
        seg = seg.strip(". -")
        if seg:
            clean_parts.append(seg)

    return "/".join(clean_parts) if clean_parts else "General"


def save_raw_transcript(
    vault_path: Union[str, Path],
    video_id: str,
    transcript_text: str,
) -> Optional[str]:
    """Saves raw timestamped transcript to hidden folder Vault/_transcripts/<video_id>.txt.

    Returns the relative path string, e.g. '_transcripts/kqtD5dpn9C8.txt'.
    """
    if not video_id or not transcript_text:
        return None

    try:
        base_vault = Path(vault_path).expanduser().resolve()
        transcripts_dir = base_vault / "_transcripts"
        transcripts_dir.mkdir(parents=True, exist_ok=True)

        transcript_file = transcripts_dir / f"{video_id}.txt"
        transcript_file.write_text(transcript_text, encoding="utf-8")
        return f"_transcripts/{video_id}.txt"
    except Exception:
        return None


def resolve_unique_filepath(target_dir: Path, filename: str) -> Path:
    """Resolves path collisions by appending a timestamp suffix if the file exists.

    Implements NFR-03 (Zero Path Collision).

    Args:
        target_dir: Directory where the file will be saved.
        filename: Intended filename (e.g. 'fastapi-guide.md').

    Returns:
        Path that is guaranteed not to exist yet on disk.
    """
    file_path = target_dir / filename
    if not file_path.exists():
        return file_path

    # File already exists: append timestamp to prevent overwriting
    stem = file_path.stem
    suffix = file_path.suffix
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    collision_filename = f"{stem}-{timestamp}{suffix}"
    new_path = target_dir / collision_filename

    # In the rare event of identical-second collision, append a counter
    counter = 1
    while new_path.exists():
        new_path = target_dir / f"{stem}-{timestamp}_{counter}{suffix}"
        counter += 1

    return new_path


def save_markdown_to_vault(
    vault_path: Union[str, Path],
    category: str,
    title: str,
    content: str,
    custom_filename: Optional[str] = None,
    video_id: Optional[str] = None,
    transcript_text: Optional[str] = None,
    index_summary: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> ObsidianSaveResult:
    """Saves a markdown note physically to the user's local Obsidian Vault.

    Creates subfolders automatically (FR-11), isolates raw transcripts to
    _transcripts/<video_id>.txt, and stores structured summaries in vault_index.json.

    Args:
        vault_path: Root path to the Obsidian Vault directory.
        category: Subfolder domain/category name (e.g. 'Backend/FastAPI').
        title: Title of the note.
        content: Markdown string to write into the file.
        custom_filename: Optional explicit filename.
        video_id: Optional 11-char YouTube video ID.
        transcript_text: Optional full raw transcript text for separate storage.
        index_summary: Optional clean 1-2 sentence conceptual summary.
        tags: Optional list of topic tags.

    Returns:
        ObsidianSaveResult with file path, name, category, and bytes written.

    Raises:
        ObsidianVaultError: If filesystem operations fail due to permissions or OS errors.
    """
    try:
        base_vault = Path(vault_path).expanduser().resolve()
        clean_cat = sanitize_category(category)
        target_dir = base_vault / clean_cat

        # Ensure category directory and all parent directories exist (FR-11)
        target_dir.mkdir(parents=True, exist_ok=True)

        # Generate and resolve filename (NFR-03)
        initial_name = custom_filename or sanitize_filename(title)
        if not initial_name.endswith(".md"):
            initial_name = f"{initial_name}.md"

        target_file = resolve_unique_filepath(target_dir, initial_name)

        # Write markdown content physically (FR-12)
        bytes_written = target_file.write_text(content, encoding="utf-8")

        # Save raw transcript separately to _transcripts/<video_id>.txt
        actual_video_id = video_id
        if not actual_video_id:
            vid_match = re.search(
                r"(?:v=|youtu\.be/|shorts/|source:\s*https?://.*?watch\?v=)([a-zA-Z0-9_-]{11})",
                content,
            )
            if vid_match:
                actual_video_id = vid_match.group(1)

        transcript_rel_path = None
        if actual_video_id and transcript_text:
            transcript_rel_path = save_raw_transcript(
                vault_path=base_vault,
                video_id=actual_video_id,
                transcript_text=transcript_text,
            )
        elif actual_video_id:
            # Check if transcript file already exists
            possible_file = base_vault / "_transcripts" / f"{actual_video_id}.txt"
            if possible_file.exists():
                transcript_rel_path = f"_transcripts/{actual_video_id}.txt"

        # Update local catalog vault_index.json automatically
        try:
            relative_path = f"{clean_cat}/{target_file.name}"

            # Extract or use tags
            final_tags = list(tags) if tags else []
            if not final_tags:
                tags_match = re.search(r"tags:\s*\[(.*?)\]", content)
                if tags_match:
                    final_tags = [t.strip().strip("'\"") for t in tags_match.group(1).split(",") if t.strip()]

            # Determine clean summary (avoiding raw code blocks)
            if index_summary and index_summary.strip():
                final_summary = index_summary.strip()
            else:
                clean_body = re.sub(r"^---\r?\n[\s\S]*?\r?\n---\r?\n", "", content).strip()
                clean_no_code = re.sub(r"```[\s\S]*?```", "", clean_body).strip()
                paragraphs = [p.strip() for p in clean_no_code.split("\n\n") if p.strip() and not p.startswith("#")]
                final_summary = paragraphs[0][:280] if paragraphs else f"Catatan mengenai {title}"

            update_vault_index(
                vault_path=base_vault,
                entry={
                    "video_id": actual_video_id,
                    "file_path": relative_path,
                    "transcript_path": transcript_rel_path,
                    "title": title,
                    "category": clean_cat,
                    "tags": final_tags,
                    "summary": final_summary,
                    "modified_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                },
            )
        except Exception:
            pass  # Non-fatal if index update has temporary issue

        return ObsidianSaveResult(
            file_path=target_file,
            file_name=target_file.name,
            category=clean_cat,
            bytes_written=bytes_written,
        )
    except Exception as exc:
        raise ObsidianVaultError(
            f"Gagal menulis catatan ke Obsidian Vault pada path '{vault_path}': {str(exc)}",
            details={"vault_path": str(vault_path), "category": category, "error": str(exc)},
        ) from exc


def get_existing_categories(vault_path: Union[str, Path]) -> List[str]:
    """Scans Obsidian Vault directory to find existing category folders and subfolders."""
    base_vault = Path(vault_path).expanduser().resolve()
    if not base_vault.exists() or not base_vault.is_dir():
        return []

    categories = []
    for d in base_vault.iterdir():
        if d.is_dir() and not d.name.startswith((".", "_")):
            categories.append(d.name)
            # Scan 2nd level subdirectories (e.g. Backend/FastAPI)
            for sub in d.iterdir():
                if sub.is_dir() and not sub.name.startswith((".", "_")):
                    categories.append(f"{d.name}/{sub.name}")

    categories.sort()
    return categories


def get_focus_targets(vault_path: Union[str, Path]) -> Dict[str, Any]:
    """Reads my_focus.md from the vault root, or returns a sensible default structure."""
    base_vault = Path(vault_path).expanduser().resolve()
    focus_file = base_vault / "my_focus.md"

    default_topics = ["Backend Architecture", "FastAPI & Async", "Agentic Systems"]
    default_depth = "deepdive"
    default_anti_goals = ["Tutorial dasar instalasi Python", "Vlog santai tanpa kode"]

    if not focus_file.exists() or not focus_file.is_file():
        # Generate initial template
        raw_md = (
            "# Target Belajar & Panduan Kurasi (My Focus)\n\n"
            "> Berkas ini menjadi acuan agen dalam mengevaluasi relevansi video (Learning Radar) dan sintesis catatan.\n\n"
            "## Pilar Topik Utama\n"
            + "\n".join(f"- #{t}" for t in default_topics)
            + "\n\n"
            f"## Preferensi Kedalaman\n- {default_depth}\n\n"
            "## Anti-Goals (Hal yang Dihindari)\n"
            + "\n".join(f"- {a}" for a in default_anti_goals)
            + "\n"
        )
        return {
            "topics": default_topics,
            "depth_preset": default_depth,
            "anti_goals": default_anti_goals,
            "raw_markdown": raw_md,
            "is_custom": False,
        }

    raw_text = focus_file.read_text(encoding="utf-8")

    # Parse topics from lines starting with '- #' or '- ' under Pilar Topik
    topics: List[str] = []
    anti_goals: List[str] = []
    depth = "deepdive"
    query_variations: Dict[str, List[str]] = {}

    current_section = None
    current_variation_topic = None

    for line in raw_text.splitlines():
        line_clean = line.strip()
        if line_clean.lower().startswith("## pilar topik"):
            current_section = "topics"
            continue
        elif line_clean.lower().startswith("## preferensi kedalaman"):
            current_section = "depth"
            continue
        elif line_clean.lower().startswith("## anti-goals"):
            current_section = "anti_goals"
            continue
        elif line_clean.lower().startswith("## variasi kueri"):
            current_section = "variations"
            continue
        elif line_clean.startswith("## "):
            current_section = None
            continue

        if current_section == "topics" and line_clean.startswith("-"):
            topic_str = line_clean.lstrip("- #").strip()
            if topic_str:
                topics.append(topic_str)
        elif current_section == "depth" and line_clean.startswith("-"):
            d = line_clean.lstrip("- ").strip().lower()
            if d in ["cheatsheet", "deepdive", "code_action"]:
                depth = d
        elif current_section == "anti_goals" and line_clean.startswith("-"):
            anti_str = line_clean.lstrip("- ").strip()
            if anti_str:
                anti_goals.append(anti_str)
        elif current_section == "variations":
            if line_clean.startswith("### "):
                current_variation_topic = line_clean.lstrip("# ").strip()
                if current_variation_topic not in query_variations:
                    query_variations[current_variation_topic] = []
            elif line_clean.startswith("-") and current_variation_topic:
                q = line_clean.lstrip("- ").strip()
                if q:
                    query_variations[current_variation_topic].append(q)

    return {
        "topics": topics or default_topics,
        "depth_preset": depth,
        "anti_goals": anti_goals or default_anti_goals,
        "query_variations": query_variations,
        "raw_markdown": raw_text,
        "is_custom": True,
    }


def save_focus_targets(vault_path: Union[str, Path], focus_data: Dict[str, Any]) -> Dict[str, Any]:
    """Writes target learning preferences physically to my_focus.md in vault root."""
    base_vault = Path(vault_path).expanduser().resolve()
    base_vault.mkdir(parents=True, exist_ok=True)
    focus_file = base_vault / "my_focus.md"

    topics = focus_data.get("topics", [])
    depth_preset = focus_data.get("depth_preset", "deepdive")
    anti_goals = focus_data.get("anti_goals", [])
    query_variations = focus_data.get("query_variations", {})

    topics_md = "\n".join(f"- #{t.strip().lstrip('#')}" for t in topics if t.strip())
    anti_goals_md = "\n".join(f"- {a.strip()}" for a in anti_goals if a.strip())

    variations_md = ""
    if query_variations and isinstance(query_variations, dict):
        var_blocks = []
        for top, var_list in query_variations.items():
            if var_list:
                items_str = "\n".join(f"- {v.strip()}" for v in var_list if v.strip())
                var_blocks.append(f"### {top}\n{items_str}")
        if var_blocks:
            variations_md = "\n\n## Variasi Kueri Eksplorasi\n" + "\n\n".join(var_blocks)

    content = f"""# Target Belajar & Panduan Kurasi (My Focus)

> Berkas ini menjadi acuan agen dalam mengevaluasi relevansi video (Learning Radar) dan sintesis materi.

## Pilar Topik Utama
{topics_md if topics_md else "- #General Knowledge"}

## Preferensi Kedalaman
- {depth_preset}

## Anti-Goals (Hal yang Dihindari)
{anti_goals_md if anti_goals_md else "- Video bertele-tele tanpa substansi"}{variations_md}
"""

    focus_file.write_text(content, encoding="utf-8")
    return {
        "topics": topics,
        "depth_preset": depth_preset,
        "anti_goals": anti_goals,
        "query_variations": query_variations,
        "raw_markdown": content,
        "file_path": str(focus_file),
    }


def get_vault_video_ids(vault_path: Union[str, Path]) -> set[str]:
    """Scans all markdown files in the vault to extract 11-char YouTube video IDs (Vault Blacklist).

    Ensures that videos already curated and stored in Obsidian are permanently eliminated from Radar.
    """
    base_vault = Path(vault_path).expanduser().resolve()
    if not base_vault.exists() or not base_vault.is_dir():
        return set()

    video_ids: set[str] = set()

    # 1. Scan vault_index.json first if available
    index_items = get_vault_index(base_vault)
    for it in index_items:
        vid = it.get("video_id")
        if vid and isinstance(vid, str) and len(vid) == 11:
            video_ids.add(vid)

    # 2. Fast regex scan of .md files (frontmatter / headers)
    yt_regex = re.compile(
        r"(?:v=|youtu\.be/|shorts/|source:\s*https?://(?:www\.)?youtube\.com/watch\?v=)([a-zA-Z0-9_-]{11})"
    )

    for md_file in base_vault.rglob("*.md"):
        if not md_file.is_file() or md_file.name.startswith((".", "_")):
            continue
        try:
            # Read first 1200 characters where frontmatter and video links reside
            head_content = md_file.read_text(encoding="utf-8", errors="ignore")[:1200]
            matches = yt_regex.findall(head_content)
            for m in matches:
                if len(m) == 11:
                    video_ids.add(m)
        except Exception:
            continue

    return video_ids


def update_vault_index(vault_path: Union[str, Path], entry: Dict[str, Any]) -> None:
    """Updates the local JSON catalog vault_index.json with a new or updated note."""
    base_vault = Path(vault_path).expanduser().resolve()
    base_vault.mkdir(parents=True, exist_ok=True)
    index_file = base_vault / "vault_index.json"

    items: List[Dict[str, Any]] = []
    if index_file.exists() and index_file.is_file():
        try:
            items = json.loads(index_file.read_text(encoding="utf-8"))
            if not isinstance(items, list):
                items = []
        except Exception:
            items = []

    # Update if already exists with same file_path, else append
    target_path = entry.get("file_path")
    updated = False
    for i, it in enumerate(items):
        if it.get("file_path") == target_path:
            items[i] = entry
            updated = True
            break

    if not updated:
        items.insert(0, entry)

    index_file.write_text(json.dumps(items, indent=2, ensure_ascii=False), encoding="utf-8")


def get_vault_index(vault_path: Union[str, Path]) -> List[Dict[str, Any]]:
    """Retrieves all indexed note items from vault_index.json."""
    base_vault = Path(vault_path).expanduser().resolve()
    index_file = base_vault / "vault_index.json"
    if not index_file.exists() or not index_file.is_file():
        return []
    try:
        items = json.loads(index_file.read_text(encoding="utf-8"))
        return items if isinstance(items, list) else []
    except Exception:
        return []
