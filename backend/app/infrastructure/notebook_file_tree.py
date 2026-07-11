from __future__ import annotations

import json
from pathlib import Path

from app.domain.notebook import InvalidTreeStructureError, NOTEBOOK_ROOT_ID, NodeNotFoundError, NotebookNode, NotebookTree, TreeEdge, TREE_FILENAME
from app.infrastructure.notebook_file_constants import TREE_EDGE_SIDES

class NotebookFileTreeMixin:
    def _empty_tree(self) -> NotebookTree:
        return NotebookTree(root_id=None, nodes=[], edges=[])

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
