from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.application.auth_service import AuthService
from app.application.folder_service import FolderService
from app.application.notebook_service import NotebookService
from app.core.config import AppConfig, default_config
from app.infrastructure.database import SQLiteDatabase
from app.infrastructure.folder_repository import SQLiteFolderRepository
from app.infrastructure.migrations import run_migrations
from app.infrastructure.notebook_file_repository import FileNotebookRepository
from app.infrastructure.passwords import PBKDF2PasswordHasher
from app.infrastructure.session_repository import SQLiteSessionRepository
from app.infrastructure.tokens import SecretsTokenGenerator
from app.infrastructure.user_repository import SQLiteUserRepository
from app.interfaces.http.auth_routes import router as auth_router
from app.interfaces.http.folder_routes import router as folder_router
from app.interfaces.http.notebook_lifecycle_routes import router as notebook_lifecycle_router
from app.interfaces.http.notebook_routes import router as notebook_router


def create_app(
    database_path: Path | None = None,
    notes_root: Path | None = None,
    session_secure: bool | None = None,
) -> FastAPI:
    base_config = default_config()
    config = AppConfig(
        database_path=database_path or base_config.database_path,
        notes_root=notes_root or base_config.notes_root,
        session_cookie_name=base_config.session_cookie_name,
        session_days=base_config.session_days,
        session_secure=base_config.session_secure if session_secure is None else session_secure,
    )

    run_migrations(config.database_path)
    database = SQLiteDatabase(config.database_path)
    database.initialize()

    users = SQLiteUserRepository(database)
    sessions = SQLiteSessionRepository(database)
    folders = SQLiteFolderRepository(database)
    notebook_repository = FileNotebookRepository(config.notes_root)
    auth_service = AuthService(
        users=users,
        sessions=sessions,
        password_hasher=PBKDF2PasswordHasher(),
        token_generator=SecretsTokenGenerator(),
        session_days=config.session_days,
    )
    folder_service = FolderService(folders=folders)
    notebook_service = NotebookService(notebooks=notebook_repository)
    notebook_service.initialize()

    app = FastAPI(title="NoteSheep API")
    app.state.config = config
    app.state.database = database
    app.state.auth_service = auth_service
    app.state.folder_service = folder_service
    app.state.notebook_service = notebook_service

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(folder_router)
    app.include_router(notebook_router)
    app.include_router(notebook_lifecycle_router)
    return app


app = create_app()
