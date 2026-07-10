from __future__ import annotations

from typing import Protocol

from app.domain.folder import DEFAULT_FOLDER_NAME, Folder


class FolderRepository(Protocol):
    def ensure_default_folder(self, user_id: int) -> Folder:
        ...

    def list_for_user(self, user_id: int) -> list[Folder]:
        ...


class FolderService:
    def __init__(self, folders: FolderRepository) -> None:
        self._folders = folders

    def ensure_default_folder(self, user_id: int) -> Folder:
        return self._folders.ensure_default_folder(user_id)

    def list_for_user(self, user_id: int) -> list[Folder]:
        self._folders.ensure_default_folder(user_id)
        return self._folders.list_for_user(user_id)


def default_folder_name() -> str:
    return DEFAULT_FOLDER_NAME
