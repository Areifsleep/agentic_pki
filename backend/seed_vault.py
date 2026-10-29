from app.core.config import settings
from app.features.video_curator.tools.obsidian_tool import save_markdown_to_vault

note_1 = """---
title: Async IO and Background Tasks in FastAPI
category: Backend/FastAPI
date: 2026-10-27
source: https://www.youtube.com/watch?v=kqtD5dpn9C8
tags: [fastapi, python, async, backend]
---

## Core Mental Model [01:25]
FastAPI menjalankan route `async def` langsung pada main event loop, sedangkan fungsi synchronous biasa `def` didelegasikan ke threadpool terpisah. Hal ini penting untuk mencegah starvation pada event loop.

## Practical Code Snippet [04:12]
```python
from fastapi import FastAPI, BackgroundTasks
import asyncio

app = FastAPI()

def send_email_notification(email: str, message: str):
    # Synchronous task executed safely in threadpool
    print(f"Sending {message} to {email}")

@app.post("/signup")
async def signup(email: str, bg: BackgroundTasks):
    bg.add_task(send_email_notification, email, "Welcome!")
    return {"status": "enqueued"}
```

## Common Pitfalls & Mistakes [08:30]
- **Blocking Compute in Async Def:** Menjalankan CPU-bound atau blocking I/O di dalam `async def` tanpa `asyncio.to_thread` akan membekukan seluruh event loop.
- **Unbounded Background Tasks:** Menumpuk jutaan task tanpa worker rate limiter.
"""

save_markdown_to_vault(
    vault_path=settings.curator_vault_path,
    category="Backend/FastAPI",
    title="Async IO and Background Tasks in FastAPI",
    content=note_1,
    video_id="kqtD5dpn9C8",
    index_summary="Panduan arsitektur async IO dan eksekusi background tasks non-blocking pada FastAPI.",
    tags=["fastapi", "python", "async"],
)

note_2 = """---
title: Production Docker Container Hardening
category: DevOps/Docker
date: 2026-10-26
source: https://www.youtube.com/watch?v=gAkwW2tuIqE
tags: [devops, docker, security, containers]
---

## Security Baseline [02:10]
Menjalankan container sebagai root adalah risiko terbesar. Selalu tentukan user non-root dan gunakan multi-stage builds.

## Multi-Stage Dockerfile [05:45]
```dockerfile
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim as runner
RUN useradd -m appuser
USER appuser
WORKDIR /app
COPY --from=builder /root/.local /home/appuser/.local
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Common Pitfalls [11:15]
- Menyimpan secrets atau API keys di dalam image layer.
- Menggunakan tag `:latest` di production.
"""

save_markdown_to_vault(
    vault_path=settings.curator_vault_path,
    category="DevOps/Docker",
    title="Production Docker Container Hardening",
    content=note_2,
    video_id="gAkwW2tuIqE",
    index_summary="Best practices keamanan dan optimasi ukuran image Docker multi-stage build untuk produksi.",
    tags=["devops", "docker", "security"],
)

print("Sample notes successfully created in vault!")
