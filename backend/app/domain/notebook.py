from __future__ import annotations

from dataclasses import dataclass


REQUIRED_NOTEBOOK_DIRECTORIES = ("note", "voice", "img")
TREE_FILENAME = "tree.json"
NOTEBOOK_ROOT_ID = "__notesheep_notebook_root__"


@dataclass(frozen=True)
class NotebookEntry:
    name: str


@dataclass(frozen=True)
class NotebookNode:
    id: str
    title: str
    text_file: str
    voice_dir: str
    img_dir: str


@dataclass(frozen=True)
class NotebookAsset:
    name: str
    display_path: str
    media_type: str


@dataclass(frozen=True)
class NotebookAssetFile:
    path: str
    media_type: str


@dataclass(frozen=True)
class NotebookUpload:
    filename: str
    content: bytes
    media_type: str


@dataclass(frozen=True)
class NotebookNodeDetail:
    node: NotebookNode
    text_path: str
    text_content: str
    image_path: str
    images: list[NotebookAsset]
    voice_path: str
    voices: list[NotebookAsset]


@dataclass(frozen=True)
class TreeEdge:
    from_id: str
    to_id: str
    side: str = "right"
    order: int = 0


@dataclass(frozen=True)
class NotebookTree:
    root_id: str | None
    nodes: list[NotebookNode]
    edges: list[TreeEdge]


class InvalidNotebookNameError(ValueError):
    pass


class DuplicateNotebookNameError(ValueError):
    pass


class NotebookNotFoundError(ValueError):
    pass


class InvalidNodeNameError(ValueError):
    pass


class DuplicateNodeNameError(ValueError):
    pass


class NodeNotFoundError(ValueError):
    pass


class NotebookAssetNotFoundError(ValueError):
    pass


class InvalidNotebookAssetError(ValueError):
    pass


class InvalidTreeStructureError(ValueError):
    pass
