from __future__ import annotations

from app.domain.notebook import NotebookNode, NotebookTree


def node_payload(node: NotebookNode) -> dict[str, str]:
    return {
        "id": node.id,
        "title": node.title,
        "textFile": node.text_file,
        "voiceDir": node.voice_dir,
        "imgDir": node.img_dir,
        "createdAt": node.created_at,
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
        "freeNodeIds": list(tree.free_node_ids),
        "deletedNodeIds": list(tree.deleted_node_ids),
    }
