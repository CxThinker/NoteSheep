from __future__ import annotations

from urllib.parse import quote

from app.domain.notebook import (
    NotebookAsset,
    NotebookEntry,
    NotebookNode,
    NotebookNodeDetail,
    NotebookTree,
    TreeEdge,
)
from app.interfaces.http.notebook_schemas import TreeRequest


def notebook_payload(notebook: NotebookEntry) -> dict[str, str]:
    return {"name": notebook.name}


def node_payload(node: NotebookNode) -> dict[str, str]:
    return {
        "id": node.id,
        "title": node.title,
        "textFile": node.text_file,
        "voiceDir": node.voice_dir,
        "imgDir": node.img_dir,
    }


def node_detail_payload(detail: NotebookNodeDetail, notebook_name: str) -> dict[str, object]:
    return {
        "node": node_payload(detail.node),
        "textPath": detail.text_path,
        "textContent": detail.text_content,
        "imagePath": detail.image_path,
        "images": [asset_payload(asset, notebook_name, detail.node.id, "images") for asset in detail.images],
        "voicePath": detail.voice_path,
        "voices": [asset_payload(asset, notebook_name, detail.node.id, "voices") for asset in detail.voices],
    }


def asset_payload(
    asset: NotebookAsset,
    notebook_name: str,
    node_id: str,
    asset_kind: str,
) -> dict[str, str]:
    return {
        "name": asset.name,
        "path": asset.display_path,
        "mediaType": asset.media_type,
        "url": (
            f"/api/notebooks/{quote(notebook_name, safe='')}/nodes/"
            f"{quote(node_id, safe='')}/assets/{asset_kind}/{quote(asset.name, safe='')}"
        ),
    }


def tree_from_request(tree: TreeRequest) -> NotebookTree:
    return NotebookTree(
        root_id=tree.rootId,
        nodes=[
            NotebookNode(
                id=node.id,
                title=node.title,
                text_file=node.textFile,
                voice_dir=node.voiceDir,
                img_dir=node.imgDir,
            )
            for node in tree.nodes
        ],
        edges=[
            TreeEdge(
                from_id=edge.from_id,
                to_id=edge.to,
                side=edge.side,
                order=edge.order,
            )
            for edge in tree.edges
        ],
    )


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
