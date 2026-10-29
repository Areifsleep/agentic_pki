---
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
