from __future__ import annotations

from app.domain.notebook import NodeNotFoundError, NotebookTree


class NotebookFileNodeDeleteMixin:
    def delete_node(self, notebook_name: str, node_id: str) -> NotebookTree:
        notebook_path = self._existing_notebook_path(notebook_name)
        tree = self._read_tree(notebook_path)
        node = self._node_or_error(tree, node_id)
        if node_id not in tree.deleted_node_ids:
            raise NodeNotFoundError(node_id)

        next_nodes = [item for item in tree.nodes if item.id != node_id]
        next_tree = NotebookTree(
            root_id=tree.root_id if next_nodes else None,
            nodes=next_nodes,
            edges=[edge for edge in tree.edges if edge.from_id != node_id and edge.to_id != node_id],
            free_node_ids=[item for item in tree.free_node_ids if item != node_id],
            deleted_node_ids=[item for item in tree.deleted_node_ids if item != node_id],
        )
        self._write_tree(notebook_path, next_tree)
        self._delete_node_files(notebook_path, node)
        return self._read_tree(notebook_path)

    def _delete_node_files(self, notebook_path, node) -> None:
        note_path = self._safe_note_file_path(notebook_path, node.text_file)
        image_dir = self._safe_resource_dir_path(notebook_path, node.img_dir, "img")
        voice_dir = self._safe_resource_dir_path(notebook_path, node.voice_dir, "voice")
        if note_path.exists():
            note_path.unlink()
        for directory in (image_dir, voice_dir):
            if directory.exists():
                self._remove_directory(directory)
