from app.core.config import settings
from app.core.errors import register_error_handlers
from app.features.video_curator.router import (
    focus_router,
    radar_router,
    router as video_curator_router,
    vault_router,
)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Agentic Knowledge Curator API",
    version="0.1.0",
    description="Backend service for Level 2 Video Learning Agent",
)

# Register central error handlers for explicit JSON responses (NFR-04)
register_error_handlers(app)

# Konfigurasi CORS agar frontend React (Vite) bisa berkomunikasi lancar
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount feature routers
app.include_router(video_curator_router)
app.include_router(vault_router)
app.include_router(focus_router)
app.include_router(radar_router)


@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "vault_path_configured": str(settings.curator_vault_path),
        "root_vault_path": str(settings.OBSIDIAN_VAULT_PATH),
    }