from __future__ import annotations

from typing import Protocol

from app.domain.notebook import (
    NotebookAssetFile,
    NotebookEntry,
    NotebookNode,
    NotebookNodeDetail,
    NotebookTree,
    NotebookUpload,
)


class NotebookRepository(Protocol):
    def initialize(self) -> None:
        ...

    def list_notebooks(self) -> list[NotebookEntry]:
        ...

    def create_notebook(self, name: str) -> NotebookEntry:
        ...

    def rename_notebook(self, current_name: str, new_name: str) -> NotebookEntry:
        ...

    def get_tree(self, notebook_name: str) -> NotebookTree:
        ...

    def get_node_detail(self, notebook_name: str, node_id: str) -> NotebookNodeDetail:
        ...

    def get_node_asset(self, notebook_name: str, node_id: str, asset_kind: str, filename: str) -> NotebookAssetFile:
        ...

    def create_node(
        self,
        notebook_name: str,
        title: str,
        parent_id: str | None = None,
        text_content: str = "",
        images: list[NotebookUpload] | None = None,
        voices: list[NotebookUpload] | None = None,
    ) -> tuple[NotebookNode, NotebookTree]:
        ...

    def replace_tree(self, notebook_name: str, tree: NotebookTree) -> NotebookTree:
        ...

    def delete_node(self, notebook_name: str, node_id: str) -> NotebookTree:
        ...


class NotebookService:
    def __init__(self, notebooks: NotebookRepository) -> None:
        self._notebooks = notebooks

    def initialize(self) -> None:
        self._notebooks.initialize()

    def list_notebooks(self) -> list[NotebookEntry]:
        return self._notebooks.list_notebooks()

    def create_notebook(self, name: str) -> NotebookEntry:
        return self._notebooks.create_notebook(name)

    def rename_notebook(self, current_name: str, new_name: str) -> NotebookEntry:
        return self._notebooks.rename_notebook(current_name, new_name)

    def get_tree(self, notebook_name: str) -> NotebookTree:
        return self._notebooks.get_tree(notebook_name)

    def get_node_detail(self, notebook_name: str, node_id: str) -> NotebookNodeDetail:
        return self._notebooks.get_node_detail(notebook_name, node_id)

    def get_node_asset(self, notebook_name: str, node_id: str, asset_kind: str, filename: str) -> NotebookAssetFile:
        return self._notebooks.get_node_asset(notebook_name, node_id, asset_kind, filename)

    def create_node(
        self,
        notebook_name: str,
        title: str,
        parent_id: str | None = None,
        text_content: str = "",
        images: list[NotebookUpload] | None = None,
        voices: list[NotebookUpload] | None = None,
    ) -> tuple[NotebookNode, NotebookTree]:
        return self._notebooks.create_node(notebook_name, title, parent_id, text_content, images, voices)

    def replace_tree(self, notebook_name: str, tree: NotebookTree) -> NotebookTree:
        return self._notebooks.replace_tree(notebook_name, tree)

    def delete_node(self, notebook_name: str, node_id: str) -> NotebookTree:
        return self._notebooks.delete_node(notebook_name, node_id)
