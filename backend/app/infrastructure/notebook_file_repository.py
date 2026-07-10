from __future__ import annotations

import json
import mimetypes
import shutil
from pathlib import Path
from uuid import uuid4

from app.domain.notebook import (
    DuplicateNodeNameError,
    DuplicateNotebookNameError,
    InvalidTreeStructureError,
    InvalidNotebookAssetError,
    InvalidNodeNameError,
    InvalidNotebookNameError,
    NOTEBOOK_ROOT_ID,
    NotebookAsset,
    NotebookAssetFile,
    NotebookAssetNotFoundError,
    NodeNotFoundError,
    NotebookEntry,
    NotebookNodeDetail,
    NotebookNode,
    NotebookNotFoundError,
    NotebookTree,
    NotebookUpload,
    REQUIRED_NOTEBOOK_DIRECTORIES,
    TREE_FILENAME,
    TreeEdge,
)


INVALID_WINDOWS_NAME_CHARS = set('<>:"/\\|?*')
TREE_EDGE_SIDES = {"left", "right"}
IMAGE_EXTENSIONS = {".avif", ".bmp", ".gif", ".jpeg", ".jpg", ".png", ".webp"}
VOICE_EXTENSIONS = {".aac", ".flac", ".m4a", ".mp3", ".ogg", ".wav", ".webm"}
WINDOWS_RESERVED_NAMES = {
    "CON",
    "PRN",
    "AUX",
    "NUL",
    *(f"COM{index}" for index in range(1, 10)),
    *(f"LPT{index}" for index in range(1, 10)),
}


class FileNotebookRepository:
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
        )
        normalized_tree = self._normalize_tree(next_tree, require_connected=True)
        self._write_tree(notebook_path, normalized_tree)
        return normalized_tree

    def create_node(
        self,
        notebook_name: str,
        title: str,
        parent_id: str | None = None,
        text_content: str = "",
        images: list[NotebookUpload] | None = None,
        voices: list[NotebookUpload] | None = None,
    ) -> tuple[NotebookNode, NotebookTree]:
        notebook_path = self._existing_notebook_path(notebook_name)
        node_title = self._normalize_node_title(title)
        note_path = notebook_path / "note" / f"{node_title}.md"
        if note_path.exists():
            raise DuplicateNodeNameError(node_title)

        tree = self._read_tree(notebook_path)
        if any(node.title == node_title or node.text_file == note_path.name for node in tree.nodes):
            raise DuplicateNodeNameError(node_title)
        effective_parent_id = parent_id if parent_id is not None else tree.root_id or NOTEBOOK_ROOT_ID
        if (
            effective_parent_id is not None
            and effective_parent_id != NOTEBOOK_ROOT_ID
            and all(node.id != effective_parent_id for node in tree.nodes)
        ):
            raise NodeNotFoundError(effective_parent_id)

        image_uploads = self._normalize_uploads(images or [], IMAGE_EXTENSIONS)
        voice_uploads = self._normalize_uploads(voices or [], VOICE_EXTENSIONS)

        node = NotebookNode(
            id=f"node-{uuid4().hex}",
            title=node_title,
            text_file=note_path.name,
            voice_dir=f"../voice/{node_title}",
            img_dir=f"../img/{node_title}",
        )
        voice_dir = notebook_path / "voice" / node_title
        image_dir = notebook_path / "img" / node_title
        try:
            note_path.write_text(text_content, encoding="utf-8")
            voice_dir.mkdir(exist_ok=True)
            image_dir.mkdir(exist_ok=True)
            self._write_uploads(image_dir, image_uploads)
            self._write_uploads(voice_dir, voice_uploads)
        except Exception:
            self._cleanup_created_node_files(note_path, image_dir, voice_dir)
            raise

        normalized_tree = self._normalize_tree(tree, require_connected=tree.root_id is not None)
        next_edges = [*normalized_tree.edges]
        if effective_parent_id is not None:
            side = self._side_for_new_child(normalized_tree, effective_parent_id)
            next_edges.append(
                TreeEdge(
                    from_id=effective_parent_id,
                    to_id=node.id,
                    side=side,
                    order=self._next_edge_order(normalized_tree, effective_parent_id, side),
                )
            )
        next_tree = NotebookTree(
            root_id=NOTEBOOK_ROOT_ID,
            nodes=[*normalized_tree.nodes, node],
            edges=next_edges,
        )
        try:
            self._write_tree(notebook_path, next_tree)
        except Exception:
            self._cleanup_created_node_files(note_path, image_dir, voice_dir)
            raise
        return node, next_tree

    def _empty_tree(self) -> NotebookTree:
        return NotebookTree(root_id=None, nodes=[], edges=[])

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

    def _read_tree(self, notebook_path: Path) -> NotebookTree:
        tree_payload = json.loads((notebook_path / "note" / TREE_FILENAME).read_text(encoding="utf-8"))
        tree = NotebookTree(
            root_id=tree_payload.get("rootId"),
            nodes=[
                NotebookNode(
                    id=str(node["id"]),
                    title=str(node["title"]),
                    text_file=str(node["textFile"]),
                    voice_dir=str(node["voiceDir"]),
                    img_dir=str(node["imgDir"]),
                )
                for node in tree_payload.get("nodes", [])
            ],
            edges=[
                TreeEdge(
                    from_id=str(edge["from"]),
                    to_id=str(edge["to"]),
                    side=str(edge.get("side", "right")),
                    order=int(edge.get("order", index)),
                )
                for index, edge in enumerate(tree_payload.get("edges", []))
            ],
        )
        return self._with_notebook_root(self._normalize_tree(tree, require_connected=False))

    def _write_tree(self, notebook_path: Path, tree: NotebookTree) -> None:
        normalized_tree = self._normalize_tree(
            self._with_notebook_root(tree),
            require_connected=tree.root_id is not None,
        )
        tree_path = notebook_path / "note" / TREE_FILENAME
        temp_path = notebook_path / "note" / f".{TREE_FILENAME}.tmp"
        temp_path.write_text(
            json.dumps(tree_payload(normalized_tree), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temp_path.replace(tree_path)

    def _node_or_error(self, tree: NotebookTree, node_id: str) -> NotebookNode:
        node = next((node for node in tree.nodes if node.id == node_id), None)
        if node is None:
            raise NodeNotFoundError(node_id)
        return node

    def _safe_note_file_path(self, notebook_path: Path, filename: str) -> Path:
        note_root = (notebook_path / "note").resolve(strict=False)
        try:
            file_path = (note_root / self._normalize_segment_name(filename)).resolve(strict=False)
            file_path.relative_to(note_root)
        except ValueError as error:
            raise InvalidTreeStructureError("Node text file path is invalid.") from error
        if file_path.parent != note_root:
            raise InvalidTreeStructureError("Node text file path is invalid.")
        return file_path

    def _safe_resource_dir_path(self, notebook_path: Path, relative_dir: str, kind: str) -> Path:
        resource_root = (notebook_path / kind).resolve(strict=False)
        candidate = ((notebook_path / "note") / relative_dir).resolve(strict=False)
        try:
            candidate.relative_to(resource_root)
        except ValueError as error:
            raise InvalidTreeStructureError("Node resource path is invalid.") from error
        return candidate

    def _safe_asset_file_path(self, directory: Path, filename: str) -> Path:
        try:
            asset_name = self._normalize_segment_name(filename)
            asset_path = (directory / asset_name).resolve(strict=False)
            asset_path.relative_to(directory.resolve(strict=False))
        except ValueError as error:
            raise NotebookAssetNotFoundError(filename) from error
        if asset_path.parent != directory.resolve(strict=False):
            raise NotebookAssetNotFoundError(filename)
        return asset_path

    def _normalize_uploads(
        self,
        uploads: list[NotebookUpload],
        allowed_extensions: set[str],
    ) -> list[NotebookUpload]:
        normalized_uploads: list[NotebookUpload] = []
        seen_names: set[str] = set()
        for upload in uploads:
            try:
                filename = self._normalize_segment_name(upload.filename)
            except ValueError as error:
                raise InvalidNotebookAssetError(upload.filename) from error
            if Path(filename).suffix.lower() not in allowed_extensions:
                raise InvalidNotebookAssetError(filename)
            folded_name = filename.casefold()
            if folded_name in seen_names:
                raise InvalidNotebookAssetError(filename)
            seen_names.add(folded_name)
            normalized_uploads.append(
                NotebookUpload(
                    filename=filename,
                    content=upload.content,
                    media_type=upload.media_type,
                )
            )
        return normalized_uploads

    def _write_uploads(self, directory: Path, uploads: list[NotebookUpload]) -> None:
        for upload in uploads:
            asset_path = self._safe_asset_file_path(directory, upload.filename)
            asset_path.write_bytes(upload.content)

    def _cleanup_created_node_files(self, note_path: Path, image_dir: Path, voice_dir: Path) -> None:
        if note_path.exists():
            note_path.unlink()
        for directory in (image_dir, voice_dir):
            if directory.exists():
                shutil.rmtree(directory)

    def _list_assets(
        self,
        notebook_name: str,
        directory: Path,
        kind: str,
        allowed_extensions: set[str],
    ) -> list[NotebookAsset]:
        if not directory.is_dir():
            return []
        return [
            NotebookAsset(
                name=asset.name,
                display_path=f"notes/{notebook_name}/{kind}/{directory.name}/{asset.name}",
                media_type=mimetypes.guess_type(asset.name)[0] or "application/octet-stream",
            )
            for asset in sorted(directory.iterdir(), key=lambda item: item.name.casefold())
            if asset.is_file() and asset.suffix.lower() in allowed_extensions
        ]

    def _side_for_new_child(self, tree: NotebookTree, parent_id: str) -> str:
        if parent_id in {tree.root_id, NOTEBOOK_ROOT_ID}:
            return "right"
        parent_edge = next((edge for edge in tree.edges if edge.to_id == parent_id), None)
        return parent_edge.side if parent_edge is not None else "right"

    def _next_edge_order(self, tree: NotebookTree, parent_id: str, side: str) -> int:
        sibling_orders = [
            edge.order
            for edge in tree.edges
            if edge.from_id == parent_id and edge.side == side
        ]
        return max(sibling_orders, default=-1) + 1

    def _normalize_tree(self, tree: NotebookTree, require_connected: bool) -> NotebookTree:
        node_ids = [node.id for node in tree.nodes]
        node_id_set = set(node_ids)
        root_id = self._canonical_root_id(tree)
        if len(node_ids) != len(node_id_set):
            raise InvalidTreeStructureError("Duplicate node ids.")
        if not tree.nodes:
            if tree.root_id is not None or tree.edges:
                raise InvalidTreeStructureError("Empty tree cannot have root or edges.")
            return NotebookTree(root_id=None, nodes=[], edges=[])
        if root_id != NOTEBOOK_ROOT_ID and root_id not in node_id_set:
            raise InvalidTreeStructureError("Root node is missing.")

        parent_by_child: dict[str, str] = {}
        grouped_edges: dict[tuple[str, str], list[tuple[int, TreeEdge]]] = {}
        valid_parent_ids = set(node_id_set)
        if root_id == NOTEBOOK_ROOT_ID:
            valid_parent_ids.add(NOTEBOOK_ROOT_ID)
        for index, edge in enumerate(tree.edges):
            if edge.from_id not in valid_parent_ids or edge.to_id not in node_id_set:
                raise InvalidTreeStructureError("Edge references missing node.")
            if edge.from_id == edge.to_id:
                raise InvalidTreeStructureError("Self edges are not allowed.")
            if edge.to_id == root_id:
                raise InvalidTreeStructureError("Root node cannot have a parent.")
            if edge.to_id in parent_by_child:
                raise InvalidTreeStructureError("Node cannot have multiple parents.")
            if edge.side not in TREE_EDGE_SIDES:
                raise InvalidTreeStructureError("Edge side is invalid.")
            if edge.order < 0:
                raise InvalidTreeStructureError("Edge order is invalid.")
            parent_by_child[edge.to_id] = edge.from_id
            grouped_edges.setdefault((edge.from_id, edge.side), []).append((index, edge))

        child_ids_by_parent: dict[str, list[str]] = {}
        for edge in tree.edges:
            child_ids_by_parent.setdefault(edge.from_id, []).append(edge.to_id)

        visiting: set[str] = set()
        visited: set[str] = set()

        def visit(node_id: str) -> None:
            if node_id in visiting:
                raise InvalidTreeStructureError("Tree cannot contain cycles.")
            if node_id in visited:
                return
            visiting.add(node_id)
            for child_id in child_ids_by_parent.get(node_id, []):
                visit(child_id)
            visiting.remove(node_id)
            visited.add(node_id)

        visit(root_id)
        visited_nodes = visited - {NOTEBOOK_ROOT_ID}
        if require_connected and visited_nodes != node_id_set:
            raise InvalidTreeStructureError("All nodes must be connected to the root.")

        parent_order = [root_id, *node_ids] if root_id == NOTEBOOK_ROOT_ID else node_ids
        normalized_edges: list[TreeEdge] = []
        group_order = sorted(
            grouped_edges.items(),
            key=lambda item: (
                parent_order.index(item[0][0]),
                0 if item[0][1] == "left" else 1,
            ),
        )
        for (from_id, side), indexed_edges in group_order:
            ordered_edges = sorted(indexed_edges, key=lambda item: (item[1].order, item[0]))
            for order, (_, edge) in enumerate(ordered_edges):
                normalized_edges.append(
                    TreeEdge(from_id=from_id, to_id=edge.to_id, side=side, order=order)
                )

        return NotebookTree(root_id=root_id, nodes=tree.nodes, edges=normalized_edges)

    def _canonical_root_id(self, tree: NotebookTree) -> str | None:
        if not tree.nodes:
            return None
        return tree.root_id or NOTEBOOK_ROOT_ID

    def _with_notebook_root(self, tree: NotebookTree) -> NotebookTree:
        if not tree.nodes or tree.root_id == NOTEBOOK_ROOT_ID:
            return tree
        root_id = self._canonical_root_id(tree)
        if root_id not in {node.id for node in tree.nodes}:
            raise InvalidTreeStructureError("Root node is missing.")
        return NotebookTree(
            root_id=NOTEBOOK_ROOT_ID,
            nodes=tree.nodes,
            edges=[
                TreeEdge(from_id=NOTEBOOK_ROOT_ID, to_id=root_id, side="right", order=0),
                *tree.edges,
            ],
        )


def node_payload(node: NotebookNode) -> dict[str, str]:
    return {
        "id": node.id,
        "title": node.title,
        "textFile": node.text_file,
        "voiceDir": node.voice_dir,
        "imgDir": node.img_dir,
    }


def tree_payload(tree: NotebookTree) -> dict[str, object]:
    return {
        "rootId": tree.root_id,
        "nodes": [node_payload(node) for node in tree.nodes],
        "edges": [
            {
                "from": edge.from_id,
                "to": edge.to_id,
                "side": edge.side,
                "order": edge.order,
            }
            for edge in tree.edges
        ],
    }
