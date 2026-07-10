from __future__ import annotations

from fastapi import Request

from app.application.auth_service import AuthService
from app.application.folder_service import FolderService
from app.application.notebook_service import NotebookService
from app.core.config import AppConfig


def get_auth_service(request: Request) -> AuthService:
    return request.app.state.auth_service


def get_config(request: Request) -> AppConfig:
    return request.app.state.config


def get_folder_service(request: Request) -> FolderService:
    return request.app.state.folder_service


def get_notebook_service(request: Request) -> NotebookService:
    return request.app.state.notebook_service
