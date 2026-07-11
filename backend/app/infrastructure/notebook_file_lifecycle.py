from __future__ import annotations

import json
import shutil
from pathlib import Path
from uuid import uuid4

from app.domain.notebook import (
    DeletedNotebookEntry,
    DuplicateNotebookNameError,
    InvalidNotebookNameError,
    NotebookEntry,
    NotebookNotFoundError,
)

TRASH_DIR_NAME = ".notesheep-trash"
TRASH_METADATA_FILENAME = "metadata.json"
TRASH_NOTEBOOK_DIR_NAME = "notebook"


class NotebookFileLifecycleMixin:
    def list_deleted_notebooks(self) -> list[DeletedNotebookEntry]:
        self.initialize()
        entries = [entry for child in self._trash_root().iterdir() if (entry := self._read_deleted_entry(child))]
        return sorted(entries, key=lambda notebook: notebook.name.casefold())

    def delete_notebook(self, name: str) -> DeletedNotebookEntry:
        notebook_name = self._normalize_notebook_name(name)
        source = self._existing_notebook_path(notebook_name)
        deleted_id = self._new_deleted_id()
        target = self._deleted_entry_path(deleted_id)
        notebook_target = target / TRASH_NOTEBOOK_DIR_NAME
        target.mkdir(parents=True, exist_ok=False)
        try:
            self._write_deleted_metadata(target, notebook_name)
            source.rename(notebook_target)
        except Exception:
            shutil.rmtree(target, ignore_errors=True)
            raise
        return DeletedNotebookEntry(id=deleted_id, name=notebook_name)

    def restore_deleted_notebook(self, deleted_id: str) -> NotebookEntry:
        entry_path = self._existing_deleted_entry_path(deleted_id)
        entry = self._read_deleted_entry(entry_path)
        if entry is None:
            raise NotebookNotFoundError(deleted_id)
        target = self._notebook_path(entry.name)
        if target.exists():
            raise DuplicateNotebookNameError(entry.name)
        notebook_source = entry_path / TRASH_NOTEBOOK_DIR_NAME
        if not self._is_complete_notebook_directory(notebook_source):
            raise NotebookNotFoundError(deleted_id)
        notebook_source.rename(target)
        shutil.rmtree(entry_path)
        return NotebookEntry(name=entry.name)

    def permanent_delete_notebook(self, deleted_id: str) -> None:
        entry_path = self._existing_deleted_entry_path(deleted_id)
        shutil.rmtree(entry_path)

    def _trash_root(self) -> Path:
        root = (self._notes_root.resolve(strict=False) / TRASH_DIR_NAME).resolve(strict=False)
        try:
            root.relative_to(self._notes_root.resolve(strict=False))
        except ValueError as error:
            raise NotebookNotFoundError(TRASH_DIR_NAME) from error
        root.mkdir(parents=True, exist_ok=True)
        return root

    def _deleted_entry_path(self, deleted_id: str) -> Path:
        if len(deleted_id) != 32 or any(char not in "0123456789abcdef" for char in deleted_id):
            raise NotebookNotFoundError(deleted_id)
        root = self._trash_root()
        target = (root / deleted_id).resolve(strict=False)
        try:
            target.relative_to(root)
        except ValueError as error:
            raise NotebookNotFoundError(deleted_id) from error
        if target.parent != root:
            raise NotebookNotFoundError(deleted_id)
        return target

    def _existing_deleted_entry_path(self, deleted_id: str) -> Path:
        entry_path = self._deleted_entry_path(deleted_id)
        if not entry_path.is_dir():
            raise NotebookNotFoundError(deleted_id)
        return entry_path

    def _new_deleted_id(self) -> str:
        while True:
            deleted_id = uuid4().hex
            if not self._deleted_entry_path(deleted_id).exists():
                return deleted_id

    def _read_deleted_entry(self, entry_path: Path) -> DeletedNotebookEntry | None:
        metadata_path = entry_path / TRASH_METADATA_FILENAME
        notebook_path = entry_path / TRASH_NOTEBOOK_DIR_NAME
        if not entry_path.is_dir() or not metadata_path.is_file() or not self._is_complete_notebook_directory(notebook_path):
            return None
        try:
            payload = json.loads(metadata_path.read_text(encoding="utf-8"))
            name = self._normalize_notebook_name(str(payload["name"]))
            return DeletedNotebookEntry(id=entry_path.name, name=name)
        except (InvalidNotebookNameError, KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None

    def _write_deleted_metadata(self, entry_path: Path, notebook_name: str) -> None:
        payload = json.dumps({"name": notebook_name}, ensure_ascii=False, indent=2)
        (entry_path / TRASH_METADATA_FILENAME).write_text(payload, encoding="utf-8")
