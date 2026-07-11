import json
from urllib.parse import quote

import pytest

from test_notebook_utils import login, make_client

def test_get_notebook_tree_returns_tree_json(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})

    response = client.get(f"/api/notebooks/{quote('笔记本1')}/tree")

    assert response.status_code == 200
    assert response.json()["tree"]["nodes"][0]["title"] == "节点一"


def test_get_node_detail_reads_markdown_and_resources(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    create_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    node = create_response.json()["node"]
    node_id = node["id"]
    (notes_root / "笔记本1" / "note" / "节点一.md").write_text("节点正文\n第二行", encoding="utf-8")
    (notes_root / "笔记本1" / "img" / "节点一" / "图一.png").write_bytes(b"fake-image")
    (notes_root / "笔记本1" / "voice" / "节点一" / "录音.mp3").write_bytes(b"fake-audio")

    response = client.get(f"/api/notebooks/{quote('笔记本1')}/nodes/{quote(node_id)}/detail")

    assert response.status_code == 200
    detail = response.json()["detail"]
    assert detail["node"] == node
    assert detail["textPath"] == "notes/笔记本1/note/节点一.md"
    assert detail["textContent"] == "节点正文\n第二行"
    assert detail["imagePath"] == "notes/笔记本1/img/节点一/"
    assert detail["images"] == [
        {
            "name": "图一.png",
            "path": "notes/笔记本1/img/节点一/图一.png",
            "mediaType": "image/png",
            "url": f"/api/notebooks/{quote('笔记本1', safe='')}/nodes/{node_id}/assets/images/{quote('图一.png', safe='')}",
        }
    ]
    assert detail["voicePath"] == "notes/笔记本1/voice/节点一/"
    assert detail["voices"] == [
        {
            "name": "录音.mp3",
            "path": "notes/笔记本1/voice/节点一/录音.mp3",
            "mediaType": "audio/mpeg",
            "url": f"/api/notebooks/{quote('笔记本1', safe='')}/nodes/{node_id}/assets/voices/{quote('录音.mp3', safe='')}",
        }
    ]

    asset_response = client.get(detail["images"][0]["url"])
    assert asset_response.status_code == 200
    assert asset_response.headers["content-type"].startswith("image/png")
    assert asset_response.content == b"fake-image"


def test_get_node_detail_returns_empty_images_when_directory_has_no_images(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    create_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    node_id = create_response.json()["node"]["id"]

    response = client.get(f"/api/notebooks/{quote('笔记本1')}/nodes/{quote(node_id)}/detail")

    assert response.status_code == 200
    detail = response.json()["detail"]
    assert detail["images"] == []
    assert detail["voices"] == []


def test_get_node_detail_rejects_resource_path_traversal(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    create_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    node_id = create_response.json()["node"]["id"]
    tree_path = notes_root / "笔记本1" / "note" / "tree.json"
    tree = json.loads(tree_path.read_text("utf-8"))
    tree["nodes"][0]["imgDir"] = "../../escape"
    tree_path.write_text(json.dumps(tree, ensure_ascii=False), encoding="utf-8")

    response = client.get(f"/api/notebooks/{quote('笔记本1')}/nodes/{quote(node_id)}/detail")

    assert response.status_code == 400
    assert response.json()["detail"] == "Notebook tree is invalid."


