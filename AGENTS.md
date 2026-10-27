# AGENTS.md — Development Rules & Guardrails

> **Workspace:** Agentic Knowledge Curator (Second Brain Learning Companion)  
> **Status:** Prototipe UTS PKI (MVP Phase 1 — Agentic Level 2 Tool-Using Agent)  
> **Rule Consumption:** Instruksi ini wajib dipatuhi oleh seluruh coding assistant (Gemini, Copilot, Cursor, Claude) sebelum menganalisis, menyarankan, atau memodifikasi kode.

---

## 1. Project Philosophy & Conscious Trade-offs

Proyek ini adalah asisten desktop/lokal berskala prototipe interaktif (*Local-First Architecture*). Hindari *premature optimization* dan *overengineering* dengan mematuhi batasan berikut:

1. **Strictly Zero-Auth**: DILARANG menambahkan autentikasi (JWT, OAuth, session, bcrypt, middleware user, atau tabel login). Aplikasi berjalan untuk single-user lokal di mesin pengembang.
2. **No Relational Database / ORM**: DILARANG menginstal SQLAlchemy, Prisma, Drizzle, Alembic, SQLite, atau PostgreSQL. File system lokal (*Obsidian Vault*) berformat `.md` adalah *Single Source of Truth*.
3. **No External Message Broker**: DILARANG menggunakan Celery, RabbitMQ, atau Redis. Gunakan `FastAPI.BackgroundTasks` atau *async execution* native Python jika diperlukan.
4. **No Vector DB Overhead (Phase 1)**: Modul tanya-jawab (*Ask & Jump Q&A*) menggunakan *in-memory transcript context injection* langsung ke Gemini API, BUKAN ChromaDB/Pinecone/Milvus.
5. **Direct SDK Usage**: Gunakan SDK resmi `google-genai` secara langsung. Hindari menambahkan wrapper berat seperti LangChain/LlamaIndex untuk tugas yang bisa diselesaikan dengan native prompting.

---

## 2. Directory & Architecture Standards

Struktur proyek mengadopsi **Feature-Driven / Vertical Slice** di backend dan **Vite Single-Page Application (SPA)** di frontend.

```text
.
├── backend/
│   ├── app/
│   │   ├── core/                  # Konfigurasi terpusat (Pydantic Settings, exceptions)
│   │   │   ├── config.py          # Settings loader (.env)
│   │   │   └── errors.py          # Custom exception classes & HTTP error handlers
│   │   ├── features/              # Modular Vertical Slices
│   │   │   └── video_curator/     # Feature: Kurasi, Transkrip & Q&A
│   │   │       ├── tools/         # Deterministic Level 2 Tools (Pure Python)
│   │   │       │   ├── obsidian_tool.py  # I/O Obsidian Vault via pathlib
│   │   │       │   └── youtube_tool.py   # Ekstraksi transcript YouTube
│   │   │       ├── router.py      # FastAPI APIRouter endpoints (/process, /qa)
│   │   │       ├── schemas.py     # Pydantic v2 DTOs (Request / Response)
│   │   │       └── service.py     # Prompt assembly & Gemini orchestration
│   │   └── main.py                # FastAPI instantiation, CORS, & router mounting
│   ├── tests/                     # Pytest suite (unit & integration)
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── assets/                # Aset statis & logo
│   │   ├── components/            # Komponen UI global (shadcn/ui primitives)
│   │   │   └── ui/                # button, input, badge, radio-group, dll.
│   │   ├── features/              # UI Feature modules
│   │   │   └── video_curator/     # Komponen spesifik Video Curator
│   │   │       ├── components/    # ControlPanel, MarkdownViewer, QAConsole, AgentStatus
│   │   │       ├── hooks/         # Custom hooks / TanStack Query mutations
│   │   │       └── types/         # Zod schemas & client interfaces
│   │   ├── lib/                   # Utility fungsi (cn helper, api client)
│   │   ├── App.tsx                # Split-Screen Main Layout
│   │   ├── index.css              # Tailwind CSS v4 theme & global styles
│   │   └── main.tsx               # React root entry point
│   ├── .oxlintrc.json             # Linter config (Oxlint)
│   ├── package.json
│   └── vite.config.ts             # Vite configuration (@tailwindcss/vite)
│
├── AGENTS.md                      # Rulebook coding agent (file ini)
└── srs_initial_agentic_pki.md     # Spesifikasi kebutuhan sistem