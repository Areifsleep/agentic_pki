"""Dynamic Prompt Engineering & Templates for Video Curator, Q&A, and Radar.

Provides pure functions to assemble structured prompts for Gemini LLM.
"""

from datetime import date
from typing import Any, Dict, List, Optional

from app.features.video_curator.schemas import CuratorConfig, SummaryMode
from app.features.video_curator.tools.radar_tool import CandidateVideo


def build_synthesis_prompt(
    transcript_text: str,
    config: CuratorConfig,
    video_url: str,
    today_str: Optional[str] = None,
    existing_categories: Optional[List[str]] = None,
    focus_targets: Optional[Dict[str, Any]] = None,
) -> str:
    """Dynamically assembles the Gemini prompt based on user-selected configuration (FR-08).

    Args:
        transcript_text: Timestamped or formatted transcript lines.
        config: Parameterized user preferences (mode, timestamps, pitfalls, code).
        video_url: Source YouTube URL for markdown frontmatter.
        today_str: Optional date string (default: YYYY-MM-DD).
        existing_categories: Existing top-level folders in vault (Anti-Folder Sprawl).
        focus_targets: User learning targets from my_focus.md for semantic grounding.

    Returns:
        Structured prompt string requesting JSON output.
    """
    current_date = today_str or date.today().isoformat()

    # 1. Mode depth instructions
    if config.mode == SummaryMode.CHEATSHEET:
        mode_instruction = (
            "MODE: Quick Cheat-Sheet (Ringkas & To-The-Point).\n"
            "- Sajikan poin-poin inti, konsep kunci, dan takeaway utama tanpa pengantar bertele-tele.\n"
            "- Gunakan bullet points ringkas dan format tegas yang enak dibaca sekilas."
        )
    elif config.mode == SummaryMode.DEEPDIVE:
        mode_instruction = (
            "MODE: Deep Dive / Study Guide (Komprehensif & Mendalam).\n"
            "- Sajikan panduan belajar lengkap yang menguraikan konsep mental model, prinsip dasar, "
            "dan tahapan arsitektur secara mendalam.\n"
            "- Pecah menjadi beberapa sub-bab analitis dengan penjelasan konseptual yang jelas."
        )
    elif config.mode == SummaryMode.CODE_ACTION:
        mode_instruction = (
            "MODE: Code & Action Only (Praktikal & Teknis).\n"
            "- Fokus mutlak pada sintaksis kode praktis, perintah CLI/terminal, konfigurasi, dan checklist aksi yang dapat langsung dieksekusi.\n"
            "- Minimalkan teori naratif; kedepankan actionable steps."
        )
    else:
        mode_instruction = "MODE: General Synthesis."

    # 2. Modifier checklist rules
    modifiers: list[str] = []
    if config.include_timestamps:
        modifiers.append(
            "- WAJIB cantumkan penanda waktu perkiraan [MM:SS] pada setiap heading topik utama berdasarkan urutan transkrip."
        )
    if config.include_pitfalls:
        modifiers.append(
            "- WAJIB sertakan bagian '## Common Pitfalls & Mistakes' [MM:SS] yang menyoroti kesalahan umum dan tips menghindarinya."
        )
    if config.include_code:
        modifiers.append(
            "- WAJIB sertakan blok kode praktis yang relevan dengan fenced code blocks (contoh: ```python, ```bash, dll)."
        )
    if config.custom_prompt and config.custom_prompt.strip():
        modifiers.append(
            f"- ARAHAN KHUSUS PENGGUNA: {config.custom_prompt.strip()}"
        )

    # 3. Grounding targets from my_focus.md
    if focus_targets and focus_targets.get("topics"):
        topics_str = ", ".join(focus_targets["topics"])
        modifiers.append(
            f"- TARGET BELAJAR PENGGUNA (MY FOCUS): {topics_str}. Beri penekanan khusus pada relevansi konsep terhadap topik tersebut jika relevan."
        )

    modifiers_instruction = "\n".join(modifiers) if modifiers else "- Tidak ada modul tambahan aktif."

    # 4. Hierarchical Domain/Subdomain Category Rules
    if existing_categories:
        cats_list_str = ", ".join(existing_categories)
        taxonomy_rule = (
            f"- STRUKTUR FOLDER EKSISTING DI VAULT: [{cats_list_str}].\n"
            "- ATURAN PENENTUAN FOLDER (FORMAT: 'Domain/Subdomain'):\n"
            "  1. Kategori tingkat pertama (Domain) WAJIB berupa payung besar (misal: Backend, Frontend, DevOps, Investment, Skincare, Machine Learning).\n"
            "  2. Subkategori tingkat kedua berupa topik/teknologi spesifik (misal: FastAPI, Docker, PostgreSQL, IHSG, Retinol).\n"
            "  3. KELONGGARAN DOMAIN BARU: Gunakan Domain yang sudah ada HANYA jika serumpun. Jika topik video berada di domain baru, BUAT Domain baru tingkat tinggi (contoh: jika folder eksisting hanya ada 'Investment', dan materi video adalah tutorial 'FastAPI', BUAT Domain baru 'Backend/FastAPI', JANGAN memaksakan ke folder Investment/IHSG).\n"
            "  4. Contoh penamaan valid: 'Backend/FastAPI', 'DevOps/Docker', 'Investment/IHSG'."
        )
    else:
        taxonomy_rule = (
            "- ATURAN PENENTUAN FOLDER (FORMAT: 'Domain/Subdomain'):\n"
            "  1. Kategori tingkat pertama (Domain) WAJIB berupa payung besar (misal: Backend, Frontend, DevOps, Investment, Skincare, Machine Learning).\n"
            "  2. Subkategori tingkat kedua berupa topik/teknologi spesifik (misal: FastAPI, Docker, PostgreSQL, IHSG, Retinol).\n"
            "  3. Contoh format valid: 'Backend/FastAPI', 'DevOps/Docker', 'Investment/IHSG'."
        )

    # 5. Complete system prompt template
    prompt = f"""Anda adalah Agentic Knowledge Curator tingkat lanjut yang bertugas merangkum video tutorial/edukasi menjadi catatan Markdown siap pakai untuk Obsidian Vault pengguna.

{mode_instruction}

INSTRUKSI TAMBAHAN (MODIFIERS & GROUNDING):
{modifiers_instruction}

ATURAN TAKSONOMI & STRUKTUR MARKDOWN:
{taxonomy_rule}
- Markdown yang dihasilkan HARUS diawali dengan YAML Frontmatter yang valid:
---
title: <Judul Ringkasan Video Bersih & Informatif>
category: <Format Domain/Subdomain>
date: {current_date}
source: {video_url}
tags: [<kumpulan_tag_relevan_huruf_kecil>]
---
- Bahasa dokumen utama: Bahasa Indonesia yang profesional, jelas, dan santai/ramah pengembang (istilah teknis tetap dalam bahasa Inggris standar).
- JANGAN menyertakan teks transkrip mentah di dalam markdown_content (transkrip disimpan terpisah secara otomatis).

FORMAT OUTPUT WAJIB:
Kembalikan tanggapan HANYA dalam format JSON valid (tanpa markdown backtick di luar JSON) dengan struktur persis seperti berikut:
{{
  "category": "<Format 'Domain/Subdomain' misal: 'Backend/FastAPI'>",
  "video_title": "<Judul Catatan yang Informatif dan Bersih>",
  "index_summary": "<1-2 kalimat padat konseptual yang merangkum inti materi untuk katalog vault>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "markdown_content": "<Isi lengkap dokumen markdown termasuk YAML frontmatter>"
}}

TRANSKRIP VIDEO SUMBER:
\"\"\"
{transcript_text}
\"\"\"
"""
    return prompt


def build_qa_prompt(transcript_text: str, question: str) -> str:
    """Assembles prompt for in-memory Ask & Jump video Q&A (FR-10)."""
    return f"""Anda adalah asisten tanya-jawab cerdas berbasis video (Ask & Jump Q&A).
Tugas Anda adalah menjawab pertanyaan pengguna secara lugas, to-the-point, dan akurat berdasarkan transkrip video berikut.

Jika topik pertanyaan dibahas pada waktu tertentu di video, sebutkan penanda waktu perkiraan tersebut (format MM:SS).

FORMAT OUTPUT WAJIB:
Kembalikan HANYA format JSON valid:
{{
  "answer": "<Jawaban to-the-point dalam Bahasa Indonesia>",
  "timestamp_reference": "<Penanda menit:detik misal '02:15' atau null jika tidak spesifik>"
}}

TRANSKRIP VIDEO:
\"\"\"
{transcript_text}
\"\"\"

PERTANYAAN PENGGUNA:
\"{question}\"
"""


def build_radar_triage_prompt(
    candidates: List[CandidateVideo],
    topics: List[str],
    depth_preset: str,
    anti_goals: List[str],
) -> str:
    """Assembles batch micro-triage prompt for 6 candidate videos."""
    candidates_text = "\n\n".join(
        f"Candidate {i+1}:\n"
        f"- video_id: {c.video_id}\n"
        f"- title: {c.title}\n"
        f"- channel: {c.channel}\n"
        f"- duration: {c.duration_str}\n"
        f"- description: {c.description}"
        for i, c in enumerate(candidates)
    )

    topics_str = ", ".join(topics) if topics else "Learning Topic"
    anti_goals_str = ", ".join(anti_goals) if anti_goals else "None"

    return f"""Anda adalah Autonomous Learning Radar Agent.
Evaluasi {len(candidates)} video YouTube berikut terhadap preferensi belajar pengguna.

TARGET BELAJAR PENGGUNA:
- Pilar Topik: {topics_str}
- Preferensi Kedalaman: {depth_preset}
- Hal yang Dihindari (Anti-Goals): {anti_goals_str}

ATURAN PENILAIAN (MATCH SCORE 0-100):
1. ATURAN PILAR TUNGGAL (OR LOGIC): Jangan merata-ratakan skor antar pilar. Jika video SANGAT COCOK dengan SALAH SATU pilar topik saja, jadikan pilar tersebut sebagai acuan utama dan berikan skor maksimal (85–100%). Jangan memotong skor hanya karena video tidak membahas pilar-pilar lainnya.
2. PEMBOBOTAN SKOR:
   - Keselarasan dengan minimal 1 pilar topik: bobot 60%
   - Kesesuaian tingkat kedalaman materi ({depth_preset}): bobot 20%
   - Bebas dari hal yang dihindari (Anti-Goals): bobot 20%
3. PANDUAN NILAI:
   - 85 - 100%: Sangat relevan dengan salah satu pilar & materi teknis berbobot.
   - 65 - 84%: Topik selaras secara umum namun pembahasannya terlalu mendasar/luas.
   - < 50%: Menyentuh anti-goals atau sama sekali di luar seluruh pilar topik.

FORMAT OUTPUT WAJIB:
Kembalikan HANYA array JSON:
[
  {{
    "video_id": "<11-char video_id>",
    "match_score": <angka 0-100>,
    "topic_tag": "<nama pilar yang paling cocok, misal #BackendArchitecture>",
    "difficulty": "<Beginner | Intermediate | Advanced>",
    "why_you_care": "<alasan spesifik relevansi dengan pilar terkait>",
    "time_roi_hint": "<estimasi letak materi inti>"
  }}
]

KANDIDAT VIDEO:
{candidates_text}
"""


def build_vault_router_prompt(catalog_summary: str, question: str) -> str:
    """Assembles prompt for Stage 1 Hierarchical Router RAG."""
    return f"""Anda adalah Hierarchical RAG Router.
Tugas Anda adalah membaca pertanyaan pengguna dan memilih MAKSIMAL 3 berkas catatan yang paling relevan dari katalog vault berikut.

KATALOG CATATAN VAULT:
{catalog_summary}

PERTANYAAN PENGGUNA:
\"{question}\"

FORMAT OUTPUT WAJIB:
Kembalikan HANYA format JSON:
{{
  "selected_files": ["<file_path_1>", "<file_path_2>"]
}}
"""


def build_vault_synthesis_prompt(docs_text: str, question: str) -> str:
    """Assembles prompt for Stage 2 Grounded RAG Synthesis."""
    return f"""Anda adalah Asisten Vault-Wide Knowledge Base (Second Brain).
Jawab pertanyaan pengguna secara akurat, terstruktur, dan berbasiskan DOKUMEN CATATAN TERPILIH berikut.
Sebutkan sitasi nama catatan (contoh: [NamaCatatan.md]) ketika mengutip konsep penting.

DOKUMEN CATATAN:
{docs_text}

PERTANYAAN PENGGUNA:
\"{question}\"

Berikan jawaban langsung dalam Bahasa Indonesia yang lugas dan profesional:
"""


def build_focus_variations_prompt(topics: List[str], depth_preset: str) -> str:
    """Assembles prompt to pre-compute search query variations for each topic pillar."""
    topics_list = "\n".join(f"- {t}" for t in topics)
    return f"""Anda adalah Kurator Riset Edukasi YouTube.
Untuk setiap pilar sasaran belajar pengguna di bawah ini, hasilkan 4 hingga 6 variasi kueri pencarian YouTube yang spesifik, padat materi, dan relevan dengan preferensi kedalaman ({depth_preset}).
Hindari kata kunci yang terlalu umum (misal: 'python'); gunakan frasa pencarian yang sering dipakai insinyur/praktisi (misal: 'fastapi background tasks production', 'python asyncio under the hood').

PILAR SASARAN:
{topics_list}

FORMAT OUTPUT WAJIB:
Kembalikan HANYA format JSON:
{{
  "variations": {{
    "<Nama Pilar 1>": ["<kueri variasi 1>", "<kueri variasi 2>", "<kueri variasi 3>"],
    "<Nama Pilar 2>": ["<kueri variasi 1>", "<kueri variasi 2>", "<kueri variasi 3>"]
  }}
}}
"""
