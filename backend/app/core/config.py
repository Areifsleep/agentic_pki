import os
import json
import tempfile
from pathlib import Path
from typing import Optional, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_config_file() -> Path:
    """Returns the path to the curator configuration file.
    When running under pytest, isolates to a temporary file so tests never overwrite user config.
    """
    if "PYTEST_CURRENT_TEST" in os.environ or "PYTEST_VERSION" in os.environ:
        return Path(tempfile.gettempdir()) / ".curator_test_config.json"
    return Path(__file__).resolve().parents[3] / ".curator_config.json"


CONFIG_FILE = get_config_file()


def _load_persisted_vault_config() -> tuple[Optional[Path], Optional[str]]:
    """Loads custom vault path persisted via UI if available."""
    cfg = get_config_file()
    if cfg.exists() and cfg.is_file():
        try:
            data = json.loads(cfg.read_text(encoding="utf-8"))
            vault_p = data.get("vault_path")
            folder_name = data.get("curator_folder_name")
            p = Path(vault_p).expanduser().resolve() if vault_p else None
            return p, folder_name
        except Exception:
            pass
    return None, None


class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.5-flash-lite"
    OBSIDIAN_VAULT_PATH: Path = Path.home() / "Documents" / "ObsidianVault"
    CURATOR_FOLDER_NAME: str = "Agentic Curator"

    @property
    def curator_vault_path(self) -> Path:
        """Dedicated workspace folder inside the Obsidian Vault to prevent polluting personal notes."""
        folder = (self.OBSIDIAN_VAULT_PATH / self.CURATOR_FOLDER_NAME).resolve()
        folder.mkdir(parents=True, exist_ok=True)
        return folder

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )


settings = Settings()

# Apply locally persisted custom configuration if available
_persisted_p, _persisted_folder = _load_persisted_vault_config()
if _persisted_p:
    settings.OBSIDIAN_VAULT_PATH = _persisted_p
if _persisted_folder:
    settings.CURATOR_FOLDER_NAME = _persisted_folder


def update_vault_config(
    vault_path: Union[str, Path],
    curator_folder_name: Optional[str] = None,
) -> dict:
    """Updates the vault path in runtime and persists it to .curator_config.json."""
    raw_str = str(vault_path).strip()
    if not raw_str:
        raise ValueError("Lokasi Obsidian Vault tidak boleh kosong.")

    resolved_path = Path(raw_str).expanduser().resolve()
    resolved_path.mkdir(parents=True, exist_ok=True)

    settings.OBSIDIAN_VAULT_PATH = resolved_path
    if curator_folder_name and curator_folder_name.strip():
        settings.CURATOR_FOLDER_NAME = curator_folder_name.strip()

    curator_path = settings.curator_vault_path
    curator_path.mkdir(parents=True, exist_ok=True)

    # Persist to local JSON file
    config_data = {
        "vault_path": str(resolved_path),
        "curator_folder_name": settings.CURATOR_FOLDER_NAME,
    }
    cfg = get_config_file()
    try:
        cfg.write_text(json.dumps(config_data, indent=2), encoding="utf-8")
    except Exception:
        pass

    return {
        "vault_path": str(settings.OBSIDIAN_VAULT_PATH),
        "curator_folder_name": settings.CURATOR_FOLDER_NAME,
        "curator_vault_path": str(curator_path),
    }
