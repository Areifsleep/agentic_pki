"""Custom application exceptions and error definitions."""

from typing import Any, Dict, Optional


class AppException(Exception):
    """Base application exception for all domain-specific errors."""

    def __init__(
        self,
        message: str,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.details = details or {}


class InvalidYouTubeURLError(AppException):
    """Raised when a provided YouTube URL is invalid or the Video ID cannot be extracted."""

    def __init__(
        self,
        message: str = "Format URL YouTube tidak valid atau Video ID tidak ditemukan.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message=message, status_code=422, details=details)


class TranscriptUnavailableError(AppException):
    """Raised when transcript cannot be fetched (disabled, unavailable, or private)."""

    def __init__(
        self,
        message: str = "Transkrip untuk video ini tidak tersedia atau dinonaktifkan.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message=message, status_code=422, details=details)


class ObsidianVaultError(AppException):
    """Raised when operations on the Obsidian Vault file system fail."""

    def __init__(
        self,
        message: str = "Gagal memproses berkas pada direktori Obsidian Vault.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message=message, status_code=500, details=details)


class LLMServiceError(AppException):
    """Raised when LLM processing or synthesis encounters a failure."""

    def __init__(
        self,
        message: str = "Gagal memproses inferensi AI Gemini.",
        details: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(message=message, status_code=502, details=details)


def register_error_handlers(app: Any) -> None:
    """Registers standard JSON exception handlers on the FastAPI application."""
    from fastapi import Request
    from fastapi.encoders import jsonable_encoder
    from fastapi.exceptions import RequestValidationError
    from fastapi.responses import JSONResponse

    @app.exception_handler(AppException)
    async def app_exception_handler(_request: Request, exc: AppException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": exc.message,
                "details": jsonable_encoder(exc.details),
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "error": "Parameter permintaan tidak valid.",
                "details": {"validation_errors": jsonable_encoder(exc.errors())},
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Terjadi kesalahan sistem internal.",
                "details": {"error_type": type(exc).__name__, "message": str(exc)},
            },
        )
