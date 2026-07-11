from __future__ import annotations

from uuid import uuid4

from app.domain.notebook import DuplicateNodeNameError, NOTEBOOK_ROOT_ID, NodeNotFoundError, NotebookTree, NotebookNode, NotebookUpload, TreeEdge
from app.infrastructure.notebook_file_constants import IMAGE_EXTENSIONS, VOICE_EXTENSIONS

class NotebookFileNodeWriterMixin:
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
        effective_parent_id = parent_id
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
        next_free_node_ids = [*normalized_tree.free_node_ids]
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
        else:
            next_free_node_ids.append(node.id)
        next_tree = NotebookTree(
            root_id=NOTEBOOK_ROOT_ID,
            nodes=[*normalized_tree.nodes, node],
            edges=next_edges,
            free_node_ids=next_free_node_ids,
            deleted_node_ids=normalized_tree.deleted_node_ids,
        )
        try:
            self._write_tree(notebook_path, next_tree)
        except Exception:
            self._cleanup_created_node_files(note_path, image_dir, voice_dir)
            raise
        return node, next_tree

