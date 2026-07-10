from dataclasses import dataclass
import os
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    database_path: Path
    notes_root: Path
    session_cookie_name: str = "notesheep_session"
    session_days: int = 14
    session_secure: bool = False


def project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_config() -> AppConfig:
    database_path = Path(os.getenv("NOTESHEEP_DATABASE_PATH", str(Path("data") / "notesheep.sqlite")))
    notes_root = Path(os.getenv("NOTESHEEP_NOTES_ROOT", str(project_root() / "notes")))
    session_secure = os.getenv("NOTESHEEP_SESSION_SECURE", "false").lower() == "true"
    return AppConfig(database_path=database_path, notes_root=notes_root, session_secure=session_secure)
