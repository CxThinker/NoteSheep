from __future__ import annotations

import mimetypes
from pathlib import Path

from app.domain.notebook import (
    DuplicateNotebookNameError,
    InvalidNotebookNameError,
    InvalidTreeStructureError,
    NotebookAssetFile,
    NotebookAssetNotFoundError,
    NodeNotFoundError,
    NotebookEntry,
    NotebookNodeDetail,
    NotebookNotFoundError,
    NotebookTree,
    REQUIRED_NOTEBOOK_DIRECTORIES,
)
from app.infrastructure.notebook_file_assets import NotebookFileAssetMixin
from app.infrastructure.notebook_file_constants import IMAGE_EXTENSIONS, VOICE_EXTENSIONS
from app.infrastructure.notebook_file_lifecycle import NotebookFileLifecycleMixin
from app.infrastructure.notebook_file_naming import NotebookFileNamingMixin
from app.infrastructure.notebook_file_node_delete import NotebookFileNodeDeleteMixin
from app.infrastructure.notebook_file_node_writer import NotebookFileNodeWriterMixin
from app.infrastructure.notebook_file_tree import NotebookFileTreeMixin


class FileNotebookRepository(
    NotebookFileLifecycleMixin,
    NotebookFileNodeDeleteMixin,
    NotebookFileNodeWriterMixin,
    NotebookFileNamingMixin,
    NotebookFileTreeMixin,
    NotebookFileAssetMixin,
):
    def __init__(self, notes_root: Path) -> None:
        self._notes_root = notes_root

    def initialize(self) -> None:
        self._notes_root.mkdir(parents=True, exist_ok=True)

    def list_notebooks(self) -> list[NotebookEntry]:
        self.initialize()
        notebooks = []
        for child in self._notes_root.iterdir():
            if child.is_dir() and self._is_complete_notebook_directory(child):
                try:
                    notebooks.append(NotebookEntry(name=self._normalize_notebook_name(child.name)))
                except InvalidNotebookNameError:
                    continue
        return sorted(notebooks, key=lambda notebook: notebook.name.casefold())

    def create_notebook(self, name: str) -> NotebookEntry:
        notebook_name = self._normalize_notebook_name(name)
        target = self._notebook_path(notebook_name)
        self.initialize()
        try:
            target.mkdir(exist_ok=False)
        except FileExistsError as error:
            raise DuplicateNotebookNameError(notebook_name) from error
        for child_name in REQUIRED_NOTEBOOK_DIRECTORIES:
            (target / child_name).mkdir(exist_ok=True)
        self._write_tree(target, self._empty_tree())
        return NotebookEntry(name=notebook_name)

    def rename_notebook(self, current_name: str, new_name: str) -> NotebookEntry:
        old_name = self._normalize_notebook_name(current_name)
        next_name = self._normalize_notebook_name(new_name)
        source = self._notebook_path(old_name)
        target = self._notebook_path(next_name)
        self.initialize()
        if old_name == next_name:
            if not self._is_complete_notebook_directory(source):
                raise NotebookNotFoundError(old_name)
            return NotebookEntry(name=next_name)
        if not self._is_complete_notebook_directory(source):
            raise NotebookNotFoundError(old_name)
        if target.exists():
            raise DuplicateNotebookNameError(next_name)
        try:
            source.rename(target)
        except FileExistsError as error:
            raise DuplicateNotebookNameError(next_name) from error
        return NotebookEntry(name=next_name)

    def get_tree(self, notebook_name: str) -> NotebookTree:
        notebook_path = self._existing_notebook_path(notebook_name)
        return self._read_tree(notebook_path)

    def get_node_detail(self, notebook_name: str, node_id: str) -> NotebookNodeDetail:
        notebook_name = self._normalize_notebook_name(notebook_name)
        notebook_path = self._existing_notebook_path(notebook_name)
        node = self._node_or_error(self._read_tree(notebook_path), node_id)
        text_file_path = self._safe_note_file_path(notebook_path, node.text_file)
        image_dir_path = self._safe_resource_dir_path(notebook_path, node.img_dir, "img")
        voice_dir_path = self._safe_resource_dir_path(notebook_path, node.voice_dir, "voice")
        text_content = text_file_path.read_text(encoding="utf-8") if text_file_path.is_file() else ""

        return NotebookNodeDetail(
            node=node,
            text_path=f"notes/{notebook_name}/note/{text_file_path.name}",
            text_content=text_content,
            image_path=f"notes/{notebook_name}/img/{image_dir_path.name}/",
            images=self._list_assets(notebook_name, image_dir_path, "img", IMAGE_EXTENSIONS),
            voice_path=f"notes/{notebook_name}/voice/{voice_dir_path.name}/",
            voices=self._list_assets(notebook_name, voice_dir_path, "voice", VOICE_EXTENSIONS),
        )

    def get_node_asset(
        self,
        notebook_name: str,
        node_id: str,
        asset_kind: str,
        filename: str,
    ) -> NotebookAssetFile:
        notebook_path = self._existing_notebook_path(notebook_name)
        node = self._node_or_error(self._read_tree(notebook_path), node_id)
        if asset_kind == "images":
            directory = self._safe_resource_dir_path(notebook_path, node.img_dir, "img")
            allowed_extensions = IMAGE_EXTENSIONS
        elif asset_kind == "voices":
            directory = self._safe_resource_dir_path(notebook_path, node.voice_dir, "voice")
            allowed_extensions = VOICE_EXTENSIONS
        else:
            raise NotebookAssetNotFoundError(filename)

        asset_path = self._safe_asset_file_path(directory, filename)
        if not asset_path.is_file() or asset_path.suffix.lower() not in allowed_extensions:
            raise NotebookAssetNotFoundError(filename)
        return NotebookAssetFile(
            path=str(asset_path),
            media_type=mimetypes.guess_type(asset_path.name)[0] or "application/octet-stream",
        )

    def replace_tree(self, notebook_name: str, tree: NotebookTree) -> NotebookTree:
        notebook_path = self._existing_notebook_path(notebook_name)
        current_tree = self._read_tree(notebook_path)
        current_node_ids = {node.id for node in current_tree.nodes}
        incoming_node_ids = {node.id for node in tree.nodes}
        if incoming_node_ids != current_node_ids or self._canonical_root_id(tree) != current_tree.root_id:
            raise InvalidTreeStructureError("Tree nodes or root do not match current notebook.")

        next_tree = NotebookTree(
            root_id=current_tree.root_id,
            nodes=current_tree.nodes,
            edges=tree.edges,
            free_node_ids=tree.free_node_ids,
            deleted_node_ids=tree.deleted_node_ids,
        )
        normalized_tree = self._normalize_tree(next_tree, require_connected=True)
        self._write_tree(notebook_path, normalized_tree)
        return normalized_tree
