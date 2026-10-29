---
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
