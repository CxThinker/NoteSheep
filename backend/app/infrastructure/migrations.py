from __future__ import annotations

from pathlib import Path

from alembic import command
from alembic.config import Config


def run_migrations(database_path: Path) -> None:
    if database_path != Path(":memory:"):
        database_path.parent.mkdir(parents=True, exist_ok=True)

    backend_root = Path(__file__).resolve().parents[2]
    config = Config(str(backend_root / "alembic.ini"))
    config.set_main_option("script_location", str(backend_root / "alembic"))
    config.set_main_option("sqlalchemy.url", sqlite_url(database_path))
    command.upgrade(config, "head")


def sqlite_url(database_path: Path) -> str:
    if database_path == Path(":memory:"):
        return "sqlite:///:memory:"
    return f"sqlite:///{database_path.resolve().as_posix()}"
