from __future__ import annotations

from pathlib import Path

from app.domain.notebook import InvalidNodeNameError, InvalidNotebookNameError, NotebookNotFoundError, REQUIRED_NOTEBOOK_DIRECTORIES, TREE_FILENAME
from app.infrastructure.notebook_file_constants import INVALID_WINDOWS_NAME_CHARS, WINDOWS_RESERVED_NAMES

class NotebookFileNamingMixin:
    def _normalize_notebook_name(self, name: str) -> str:
        try:
            return self._normalize_segment_name(name)
        except ValueError as error:
            raise InvalidNotebookNameError(name) from error

    def _normalize_node_title(self, title: str) -> str:
        try:
            return self._normalize_segment_name(title)
        except ValueError as error:
            raise InvalidNodeNameError(title) from error

    def _normalize_segment_name(self, value: str) -> str:
        name = value.strip()
        if not name or name in {".", ".."}:
            raise ValueError(value)
        if name.endswith("."):
            raise ValueError(value)
        if any(char in INVALID_WINDOWS_NAME_CHARS or ord(char) < 32 for char in name):
            raise ValueError(value)
        reserved_probe = name.split(".", maxsplit=1)[0].upper()
        if reserved_probe in WINDOWS_RESERVED_NAMES:
            raise ValueError(value)
        return name

    def _notebook_path(self, notebook_name: str) -> Path:
        root = self._notes_root.resolve(strict=False)
        target = (root / notebook_name).resolve(strict=False)
        try:
            target.relative_to(root)
        except ValueError as error:
            raise InvalidNotebookNameError(notebook_name) from error
        if target.parent != root:
            raise InvalidNotebookNameError(notebook_name)
        return target

    def _existing_notebook_path(self, notebook_name: str) -> Path:
        path = self._notebook_path(self._normalize_notebook_name(notebook_name))
        if not self._is_complete_notebook_directory(path):
            raise NotebookNotFoundError(notebook_name)
        return path

    def _is_complete_notebook_directory(self, path: Path) -> bool:
        return (
            all((path / child_name).is_dir() for child_name in REQUIRED_NOTEBOOK_DIRECTORIES)
            and (path / "note" / TREE_FILENAME).is_file()
        )
