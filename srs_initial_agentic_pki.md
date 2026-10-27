# Software Requirements Specification (SRS)

## Proyek: Agentic Knowledge Curator (Second Brain Learning Companion)

**Versi:** 0.4.0-interactive-learning

**Status:** Baseline Pengembang (Parameterized Prompting, Auto-Categorization & Interactive Q&A)

**Target Rilis:** Prototipe UTS PKI (MVP Phase 1)

---

## 1. Pendahuluan

### 1.1 Tujuan

Dokumen ini mendefinisikan spesifikasi kebutuhan sistem untuk **Agentic Knowledge Curator**. Dokumen ini menjadi acuan tunggal bagi tim pengembang dan pembatas konteks untuk *agentic coding assistant*. Fokus utama tahap ini adalah menciptakan pendamping belajar mandiri yang efisien: merangkum video YouTube secara *to-the-point* sesuai preferensi belajar pengguna, mengelompokkan materi secara otomatis ke subfolder Obsidian Vault lokal, serta menyediakan interaksi tanya-jawab langsung tanpa mewajibkan pengguna menonton ulang seluruh durasi video.

### 1.2 Lingkup Produk

Sistem adalah asisten kurasi materi cerdas tingkat 2 (*Tool-Using Agent*) berbasis *Local-First Architecture* yang:

1. Menerima URL video YouTube beserta preferensi perangkuman terparameter melalui antarmuka pengguna.
2. Mengekstrak materi transkrip menggunakan alat deterministik *youtube-transcript-api* (Level 2: persepsi lingkungan eksternal).
3. Merakit instruksi secara dinamis (*Parameterized Prompting*) berdasarkan pilihan mode kedalaman dan modul tambahan yang dicentang pengguna.
4. Mengklasifikasi domain materi video secara otomatis dan menyusun ringkasan ke standar Markdown menggunakan Google Gemini API.
5. Mengarahkan dan menuliskan berkas catatan `.md` secara fisik ke dalam subfolder kategori di direktori lokal (*Obsidian Vault*) pengguna (Level 2: mutasi lingkungan lokal).
6. Menyediakan sesi tanya-jawab interaktif (*Ask & Jump Q&A*) berbasis transkrip di memori agar pengguna dapat menanyakan poin spesifik materi tanpa menonton ulang video.
7. Menyediakan umpan balik dua arah secara visual melalui indikator status agen, transisi mikro, notifikasi toast, dan pratinjau dokumen Markdown interaktif.

### 1.3 Definisi dan Singkatan

* **PKI:** Perancangan Komputasi Interaktif (*Human-Computer Interaction / HCI*).
* **Agentic Level 2:** Agen otonom yang memanggil alat eksternal untuk membaca dan mengubah lingkungan komputasi.
* **Obsidian Vault:** Direktori lokal pada sistem operasi yang menyimpan berkas catatan berformat Markdown mentah.
* **Parameterized Prompting:** Pola perakitan instruksi LLM secara dinamis menggunakan konfigurasi terstruktur dari antarmuka pengguna.
* **Auto-Categorization Routing:** Mekanisme penentuan subfolder tujuan penyimpanan berkas berdasarkan klasifikasi domain materi oleh agen.
* **Local-First Software:** Perangkat lunak yang memprioritaskan penyimpanan data pada penyimpanan lokal komputer tanpa ketergantungan wajib pada database cloud.

---

## 2. Arsitektur Sistem & Batasan Rekayasa

### 2.1 Prinsip Desain & Batasan Arsitektur

Untuk menjaga fokus pada penilaian tugas PKI dan mencegah pembengkakan cakupan:

1. **Local-First & Tanpa Autentikasi:** Sistem dirancang sebagai asisten desktop pribadi lokal. Modul autentikasi pengguna (JWT, bcrypt, login/register) secara tegas ditiadakan.
2. **File System sebagai Sumber Kebenaran Tunggal:** Penyimpanan utama adalah berkas fisik Markdown di dalam direktori Obsidian Vault. Penggunaan ORM relasional berat (SQLAlchemy, Alembic, PostgreSQL) ditiadakan pada fase ini.
3. **Konkurensi Asinkronus Bawaan:** Penanganan eksekusi latar belakang memanfaatkan utilitas bawaan `FastAPI.BackgroundTasks` tanpa broker pesan eksternal (Celery, Redis).

### 2.2 Backend Stack (Python 3.11+)

| Library / Tool | Kategori | Alasan Pemilihan & Peran Arsitektur |
| --- | --- | --- |
| **FastAPI** (`>=0.110`) | Web Framework | Routing asinkronus cepat, validasi otomatis, dan OpenAPI Swagger interaktif. |
| **Uvicorn** (`[standard]`) | ASGI Server | Server produksi berbasis *uvloop* dengan latensi rendah. |
| **Pydantic v2** (`>=2.6`) | Data Validation | Validasi skema input/output berbasis Rust engine yang sangat cepat. |
| **Pydantic-Settings** | Configuration | Membaca berkas `.env` secara terpusat dengan pengetikan data yang ketat. |
| **google-genai** | LLM Client | SDK resmi Google untuk Gemini API (model `gemini-3.5-flash-lite`). |
| **youtube-transcript-api** | Deterministic Tool | Ekstraksi transkrip deterministik tanpa kebutuhan peramban *headless*. |
| **pytest** & **httpx** | Testing Suite | Pengujian otomatis unit dan integrasi untuk memastikan endpoint bebas galat. |

### 2.3 Frontend Stack (React + TypeScript + Vite)

| Library / Tool | Kategori | Alasan Pemilihan & Peran Arsitektur |
| --- | --- | --- |
| **Vite** | Build Tool | Kompilasi kilat dan *Hot Module Replacement* instan. |
| **React Router** (`v8`) | Client Routing | Isolasi navigasi halaman (*Dashboard*, *Settings*). |
| **shadcn/ui** (Radix UI) | UI Primitives | Komponen antarmuka aksesibel (Button, Input, Card, Badge, RadioGroup, Checkbox, ScrollArea). |
| **motion** (`framer-motion`) | State Transitions | Animasi transisi halus pada pergantian status agen. |
| **Sonner** | Toast Feedback | Notifikasi mengambang saat berkas tersimpan atau terjadi kendala jaringan. |
| **Zustand** | Global State | Pengelolaan status reaktif agen, video aktif, dan konfigurasi vault. |
| **TanStack Query** (`v5`) | Server State | Penanganan *mutation* dan *query* API backend dengan manajemen *loading* otomatis. |
| **react-markdown** & **remark-gfm** | Document Parser | Parser Markdown dengan dukungan tabel, checkbox, dan blok kode. |
| **`@tailwindcss/typography`** | Markdown Engine Styler | Kelas utilitas `prose` untuk memformat tampilan Markdown menyerupai Obsidian. |
| **Zod** | Client Validation | Validasi formulir URL dan parameter konfigurasi sebelum transmisi. |
| **lucide-react** | Iconography | Ikon antarmuka modular berukuran ringan. |

---

## 3. Kebutuhan Antarmuka Eksternal

### 3.1 Antarmuka Pengguna (Split-Screen Workspace)

Tata letak utama mengusung model kerja terbelah di dalam `MainLayout`:

* **Panel Kiri (Control & Interaction Space):**
* **Status Header:** Menampilkan status koneksi backend dan lokasi Vault aktif.
* **Interactive Agent Container:** Menampilkan status agen (`IDLE`, `PROCESSING`, `SUCCESS`, `ERROR`) menggunakan Badge dan animasi transisi.
* **URL Input Field:** Kolom input URL YouTube dengan validasi format instan via Zod.
* **Curator Control Panel (Parameterized Prompting):**
* *Mode Selector (Radio Buttons):* Pilihan mode kedalaman (*Quick Cheat-Sheet*, *Deep Dive / Study Guide*, *Code & Action Only*).
* *Modular Modifiers (Checklist):* Opsi tambahan (*Include Timestamp Anchors*, *Extract Common Pitfalls*, *Practical Code Snippets*).


* **Ask & Jump Console:** Kolom dialog kontekstual di bawah formulir utama untuk mengajukan pertanyaan materi spesifik berdasarkan video yang sedang aktif.


* **Panel Kanan (Knowledge Workspace):**
* **Markdown Preview Panel:** Penampil dokumen Markdown terformat menggunakan `react-markdown` dan `@tailwindcss/typography`.
* **Document Metadata Bar:** Menampilkan kategori otomatis, nama file, dan path penyimpanan lokal di Obsidian.
* **Action Bar:** Tombol salin ke clipboard dan indikator status penyimpanan fisik.



### 3.2 Antarmuka Perangkat Lunak & Sistem Operasi

* **Google Gemini API:** Inferensi perangkuman terstruktur, klasifikasi domain materi, dan penalaran tanya-jawab transkrip.
* **YouTube Transcript API:** Ekstraksi data subtitle publik (prioritas bahasa Indonesia `id`, lalu bahasa Inggris `en`).
* **OS File System (`pathlib`):** Pembuatan subfolder kategori otomatis dan penulisan berkas fisik `.md` pada target path sistem operasi lokal.

---

## 4. Kebutuhan Fungsional (Functional Requirements)

### Modul 1: Antarmuka Interaktif Pengguna (Frontend Core)

* **FR-01 (Parameterized Configuration Form):** Antarmuka menyediakan pilihan mode perangkuman (*Preset*) dan kumpulan kotak centang (*Checklist*) untuk mengontrol parameter sintesis materi.
* **FR-02 (Agent State Machine & Feedback):** Antarmuka menampilkan status agen secara reaktif (`IDLE`, `PROCESSING`, `SUCCESS`, `ERROR`) menggunakan animasi visual halus dan notifikasi toast.
* **FR-03 (Interactive Markdown Viewer):** Antarmuka merender output Markdown lengkap dengan format judul, daftar berbutir, blok kode, dan tabel.
* **FR-04 (Ask & Jump Interface):** Antarmuka menyediakan kolom input pertanyaan cepat pasca-pemrosesan video untuk berdialog langsung mengenai isi materi tanpa memuat ulang transkrip.

### Modul 2: Validasi & Ekstraksi Video (Backend - Tool 1)

* **FR-05 (URL Parsing & ID Extraction):** Backend memvalidasi format URL YouTube (standar, tautan pendek, Shorts) dan mengekstrak 11 karakter Video ID via Regex.
* **FR-06 (Deterministic Transcript Ingestion):** Fungsi penarik transkrip mengekstrak subtitle dengan urutan prioritas bahasa Indonesia (`id`) lalu bahasa Inggris (`en`), serta menggabungkan segmen teks bersama referensi waktu.
* **FR-07 (Transcript Error Handling):** Menangkap kegagalan subtitle dinonaktifkan atau video privat, lalu menerjemahkannya ke kode status HTTP 422 terstruktur.

### Modul 3: LLM Synthesis & Modular Prompt Engine (Backend Core)

* **FR-08 (Dynamic Prompt Assembly):** Sistem merakit instruksi sistem ke Gemini API secara dinamis berdasarkan kombinasi mode kedalaman dan kotak centang yang dipilih pengguna.
* **FR-09 (Auto-Categorization & Metadata Generation):** LLM mengidentifikasi kategori domain materi (contoh: *Web Development*, *Algoritma*, *Sistem Terdistribusi*) dan menghasilkan judul berkas yang bersih dari karakter ilegal sistem operasi.
* **FR-10 (In-Memory Video Q&A Service):** Layanan backend menyediakan endpoint tanya-jawab berbasis transkrip video aktif di memori untuk menjawab pertanyaan spesifik pengguna secara lugas beserta referensi perkiraan menit pembahasan.

### Modul 4: Integrasi File System Obsidian (Backend - Tool 2)

* **FR-11 (Dynamic Subfolder Routing):** Sistem secara otomatis membuat direktori kategori jika belum ada di dalam path Obsidian Vault (`{OBSIDIAN_VAULT_PATH}/{category}/`).
* **FR-12 (Physical File Persistence):** Sistem menuliskan berkas catatan `.md` secara fisik ke direktori kategori yang telah ditentukan menggunakan operasi I/O lokal murni.

---

## 5. Modul Ekstensi Masa Depan (Roadmap Extension)

*Fitur berikut dialokasikan untuk tahap lanjutan setelah prototipe fungsional inti stabil:*

* **EXT-01 (Avatar Reactive Representation):** Komponen visual karakter ekspresif yang terhubung dengan status agen pada panel kontrol.
* **EXT-02 (Web Speech API Integration):** Masukan suara langsung ke kolom formulir dan kolom tanya-jawab menggunakan antarmuka suara peramban.
* **EXT-03 (Vault-wide RAG System):** Penambahan vector store lokal (ChromaDB) untuk memungkinkan pencarian semantik lintas seluruh catatan lama yang tersimpan di vault.

---

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)

### 6.1 Performa & Kecepatan Respons

* **NFR-01 (End-to-End Latency):** Siklus ekstraksi, sintesis model kilat (`gemini-1.5-flash`), dan penulisan berkas selesai dalam rentang waktu di bawah 10 detik pada koneksi internet normal.
* **NFR-02 (Interactive Q&A Latency):** Tanggapan atas pertanyaan interaktif video aktif selesai dalam rentang waktu di bawah 3 detik.

### 6.2 Keandalan & Integritas Data

* **NFR-03 (Zero Path Collision):** Jika berkas dengan nama yang sama sudah ada di dalam subfolder kategori, sistem menambahkan penanda timestamp numerik agar tidak menimpa catatan lama secara tidak sengaja.
* **NFR-04 (Explicit Error Contracts):** Seluruh kegagalan alat eksternal menghasilkan respons JSON terstruktur tanpa pelepasan galat internal HTTP 500 mentah.

### 6.3 Standar Kualitas Kode

* **NFR-05 (Tool Modularity):** Seluruh logika ekstraksi YouTube dan penulisan file diisolasi sebagai fungsi Python murni tanpa ketergantungan pada pustaka HTTP framework.

---

## 7. Spesifikasi Kontrak Data (API Contract)

### 7.1 Endpoint Kurasi Video: `POST /api/v1/video/process`

#### Skema Permintaan (*Request Payload*):

```json
{
  "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
  "config": {
    "mode": "cheatsheet",
    "include_timestamps": true,
    "include_pitfalls": true,
    "include_code": true
  }
}

```

#### Skema Tanggapan Berhasil (*Response Success - 200 OK*):

```json
{
  "success": true,
  "video_id": "kqtD5dpn9C8",
  "category": "Python Architecture",
  "video_title": "Async IO and Background Tasks in FastAPI",
  "file_name": "async-io-and-background-tasks-in-fastapi.md",
  "file_path": "/home/user/ObsidianVault/Python Architecture/async-io-and-background-tasks-in-fastapi.md",
  "markdown_content": "---\ntitle: Async IO and Background Tasks in FastAPI\ncategory: Python Architecture\ndate: 2026-10-13\nsource: https://www.youtube.com/watch?v=kqtD5dpn9C8\ntags: [python, fastapi, architecture]\n---\n\n## Core Mental Model\nFastAPI menjalankan async route pada main event loop, sedangkan fungsi synchronous biasa dieksekusi di threadpool terpisah...\n\n## Practical Syntax [04:12]\n```python\n@app.post('/task')\nasync def trigger(bg: BackgroundTasks):\n    bg.add_task(run_worker)\n```\n\n## Common Pitfalls [08:30]\n- Menjalankan blocking compute-heavy operations di dalam fungsi `async def` tanpa threadpool.",
  "execution_time_seconds": 3.12,
  "message": "Catatan berhasil dirangkum dan disimpan ke subfolder kategori Obsidian."
}

```

---

### 7.2 Endpoint Interaktif: `POST /api/v1/video/qa`

#### Skema Permintaan (*Request Payload*):

```json
{
  "video_id": "kqtD5dpn9C8",
  "question": "Bagian mana yang menjelaskan beda async def sama def biasa?"
}

```

#### Skema Tanggapan Berhasil (*Response Success - 200 OK*):

```json
{
  "success": true,
  "answer": "Di menit 02:15 pembicara menjelaskan bahwa `def` biasa akan dilempar ke external threadpool sehingga aman untuk blocking I/O, sedangkan `async def` berjalan langsung di main event loop dan tidak boleh di-block.",
  "timestamp_reference": "02:15"
}

```

---

## 8. Matriks Tanggung Jawab Tim

| Anggota Tim | Peran Utama | Tanggung Jawab Modul |
| --- | --- | --- |
| **Anggota 1 (Lead Developer)** | Backend & Dynamic Prompt Pipeline | `backend/app/` (FastAPI routes, Pydantic schemas, dynamic prompt builder, subfolder routing file system, dan in-memory Q&A service). |
| **Anggota 2 (Frontend Developer)** | UI/UX & Interaction Controls | `frontend/src/` (Zustand store, panel preset radio & checklist modifier, form validasi Zod, komponen tanya-jawab, dan Markdown viewer). |
| **Anggota 3 (QA & Research Lead)** | Evaluasi HCI & Benchmarking | Pengujian variasi mode perangkuman pada 20 video, pencatatan waktu respons sistem, evaluasi keterbacaan materi, dan penulisan artikel ilmiah PKI. |

---

## 9. Inventaris Lengkap Pustaka & Perkakas

### 9.1 Backend Ecosystem (Python 3.11+)

| Nama Paket | Versi Target | Peran Arsitektur |
| --- | --- | --- |
| **`fastapi`** | `>=0.110.0` | Routing API asinkronus dan auto-dokumentasi OpenAPI. |
| **`uvicorn[standard]`** | `>=0.29.0` | ASGI Server berlatensi rendah berbasis *uvloop*. |
| **`pydantic`** | `>=2.6.0` | Validasi model data permintaan konfigurasi dan skema respons. |
| **`pydantic-settings`** | `>=2.2.0` | Pengelolaan variabel lingkungan terpusat dari `.env`. |
| **`google-genai`** | `>=0.1.0` | SDK resmi Google untuk orkestrasi model Gemini. |
| **`youtube-transcript-api`** | `>=0.6.2` | Ekstraksi transkrip subtitle YouTube secara deterministik. |
| **`pytest` & `httpx**` | Terbaru | Suite pengujian otomatis untuk memvalidasi endpoint dan logika pemrosesan. |

```bash
# Perintah instalasi dependensi backend:
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings google-genai youtube-transcript-api pytest httpx
pip freeze > requirements.txt

```

---

### 9.2 Frontend Ecosystem (React + TypeScript + Vite)

| Nama Paket | Versi Target | Peran Arsitektur |
| --- | --- | --- |
| **`shadcn/ui` (Radix UI)** | Komponen Lokal | Komponen UI aksesibel (Button, Input, Card, Badge, RadioGroup, Checkbox, ScrollArea). |
| **`motion` (`framer-motion`)** | `>=11.0.0` | Mesin animasi mikro untuk transisi status agen. |
| **`sonner`** | `>=1.4.0` | Sistem notifikasi toast mengambang. |
| **`@tailwindcss/typography`** | Terbaru | Penata gaya dokumen Markdown via kelas utilitas `prose`. |
| **`react-markdown`** & **`remark-gfm`** | Terbaru | Parser Markdown AST dengan dukungan tabel dan format GFM. |
| **`zustand`** | `>=4.5.0` | Pengelola state global agen, konfigurasi aktif, dan histori interaksi. |
| **`@tanstack/react-query`** | `>=5.0.0` | Pengelola state server asinkronus dan penanganan siklus mutasi API. |
| **`zod`** | `>=3.22.0` | Validasi skema input form perangkuman dan pertanyaan pengguna. |
| **`lucide-react`** | Terbaru | Ikon antarmuka modular. |
| **`clsx` & `tailwind-merge**` | Terbaru | Penggabung kelas Tailwind tanpa konflik spesifisitas. |

```bash
# Perintah instalasi dependensi frontend:
npm install motion sonner react-markdown remark-gfm @tailwindcss/typography zustand @tanstack/react-query zod lucide-react clsx tailwind-merge
npx shadcn@latest init
npx shadcn@latest add button input card badge radio-group checkbox scroll-area

```

---

### 9.3 Matriks Perkakas yang Sengaja Ditiadakan

| Perkakas yang Dihindari | Risiko Overengineering | Solusi Alternatif |
| --- | --- | --- |
| **SQLAlchemy / Alembic** | Menambah kerumitan migrasi skema pada sistem berkas lokal. | Penyimpanan langsung file Markdown ke direktori Obsidian via `pathlib`. |
| **PyJWT / bcrypt / Auth** | Membebani aplikasi desktop lokal dengan alur autentikasi yang tidak diperlukan. | Operasi lokal tanpa hambatan login (*Zero-auth UX*). |
| **Celery / Redis** | Kebutuhan instalasi server broker eksternal yang membebani memori lokal. | `FastAPI.BackgroundTasks` bawaan framework Python. |
| **Vector DB Eksternal (Pinecone/Milvus)** | Kebutuhan koneksi cloud dan latensi jaringan tambahan untuk sesi tanya-jawab video aktif. | In-memory transcript context injection langsung pada prompt Gemini. |