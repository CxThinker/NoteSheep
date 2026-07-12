import json
from datetime import datetime, timedelta
from urllib.parse import quote

import pytest

from test_notebook_utils import login, make_client

def test_create_node_writes_markdown_and_updates_tree(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})

    response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})

    assert response.status_code == 201
    payload = response.json()
    assert payload["node"]["title"] == "节点一"
    assert payload["node"]["textFile"] == "节点一.md"
    assert payload["node"]["voiceDir"] == "../voice/节点一"
    assert payload["node"]["imgDir"] == "../img/节点一"
    assert_is_current_beijing_time(payload["node"]["createdAt"])
    assert payload["tree"]["nodes"][0]["createdAt"] == payload["node"]["createdAt"]
    assert payload["tree"]["rootId"] == "__notesheep_notebook_root__"
    assert payload["tree"]["edges"] == []
    assert payload["tree"]["freeNodeIds"] == [payload["node"]["id"]]
    assert (notes_root / "笔记本1" / "note" / "节点一.md").read_text("utf-8") == ""
    assert (notes_root / "笔记本1" / "voice" / "节点一").is_dir()
    assert (notes_root / "笔记本1" / "img" / "节点一").is_dir()

    tree = json.loads((notes_root / "笔记本1" / "note" / "tree.json").read_text("utf-8"))
    assert tree == payload["tree"]


def test_legacy_node_without_created_at_returns_current_beijing_time(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    tree_path = notes_root / "笔记本1" / "note" / "tree.json"
    tree = json.loads(tree_path.read_text("utf-8"))
    tree["nodes"][0].pop("createdAt", None)
    tree_path.write_text(json.dumps(tree, ensure_ascii=False), encoding="utf-8")

    response = client.get(f"/api/notebooks/{quote('笔记本1')}/tree")

    assert response.status_code == 200
    assert_is_current_beijing_time(response.json()["tree"]["nodes"][0]["createdAt"])


def test_create_node_accepts_multipart_title_only(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})

    response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", data={"title": "节点一"})

    assert response.status_code == 201
    payload = response.json()
    assert payload["node"]["title"] == "节点一"
    assert (notes_root / "笔记本1" / "note" / "节点一.md").read_text("utf-8") == ""
    assert (notes_root / "笔记本1" / "img" / "节点一").is_dir()
    assert (notes_root / "笔记本1" / "voice" / "节点一").is_dir()


def test_create_node_accepts_multipart_content_and_assets(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})

    response = client.post(
        f"/api/notebooks/{quote('笔记本1')}/nodes",
        data={"title": "节点一", "textContent": "创建时写入正文"},
        files=[
            ("images", ("图一.png", b"fake-image", "image/png")),
            ("voices", ("录音.mp3", b"fake-audio", "audio/mpeg")),
        ],
    )

    assert response.status_code == 201
    node_id = response.json()["node"]["id"]
    assert (notes_root / "笔记本1" / "note" / "节点一.md").read_text("utf-8") == "创建时写入正文"
    assert (notes_root / "笔记本1" / "img" / "节点一" / "图一.png").read_bytes() == b"fake-image"
    assert (notes_root / "笔记本1" / "voice" / "节点一" / "录音.mp3").read_bytes() == b"fake-audio"

    detail_response = client.get(f"/api/notebooks/{quote('笔记本1')}/nodes/{quote(node_id)}/detail")
    assert detail_response.status_code == 200
    detail = detail_response.json()["detail"]
    assert detail["textContent"] == "创建时写入正文"
    assert detail["images"][0]["name"] == "图一.png"
    assert detail["voices"][0]["name"] == "录音.mp3"


def test_create_node_rejects_unsupported_uploaded_asset(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})

    response = client.post(
        f"/api/notebooks/{quote('笔记本1')}/nodes",
        data={"title": "节点一"},
        files=[("images", ("不是图片.txt", b"not-image", "text/plain"))],
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Node asset is invalid."
    assert not (notes_root / "笔记本1" / "note" / "节点一.md").exists()
    assert not (notes_root / "笔记本1" / "img" / "节点一").exists()


def test_create_node_with_parent_records_edge(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    root_response = client.post(
        f"/api/notebooks/{quote('笔记本1')}/nodes",
        json={"title": "节点一", "parentId": "__notesheep_notebook_root__"},
    )
    root_id = root_response.json()["node"]["id"]

    response = client.post(
        f"/api/notebooks/{quote('笔记本1')}/nodes",
        json={"title": "节点二", "parentId": root_id},
    )

    assert response.status_code == 201
    assert response.json()["tree"]["edges"] == [
        {"from": "__notesheep_notebook_root__", "to": root_id, "side": "right", "order": 0},
        {"from": root_id, "to": response.json()["node"]["id"], "side": "right", "order": 0}
    ]


def test_create_node_without_parent_after_root_records_free_node(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    root_response = client.post(
        f"/api/notebooks/{quote('笔记本1')}/nodes",
        json={"title": "节点一", "parentId": "__notesheep_notebook_root__"},
    )
    root_id = root_response.json()["node"]["id"]

    response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点二"})

    assert response.status_code == 201
    assert response.json()["tree"]["edges"] == [
        {"from": "__notesheep_notebook_root__", "to": root_id, "side": "right", "order": 0},
    ]
    assert response.json()["tree"]["freeNodeIds"] == [response.json()["node"]["id"]]


def test_create_node_with_notebook_root_parent_records_top_level_edge(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    first_response = client.post(
        f"/api/notebooks/{quote('笔记本1')}/nodes",
        json={"title": "节点一", "parentId": "__notesheep_notebook_root__"},
    )
    first_id = first_response.json()["node"]["id"]

    response = client.post(
        f"/api/notebooks/{quote('笔记本1')}/nodes",
        json={"title": "节点二", "parentId": "__notesheep_notebook_root__"},
    )

    assert response.status_code == 201
    assert response.json()["tree"]["rootId"] == "__notesheep_notebook_root__"
    assert response.json()["tree"]["edges"] == [
        {"from": "__notesheep_notebook_root__", "to": first_id, "side": "right", "order": 0},
        {
            "from": "__notesheep_notebook_root__",
            "to": response.json()["node"]["id"],
            "side": "right",
            "order": 1,
        },
    ]


def test_create_node_rejects_duplicate_title(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})

    first_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    duplicate_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409


def assert_is_current_beijing_time(value: str) -> None:
    parsed = datetime.fromisoformat(value)
    now = datetime.now(parsed.tzinfo)
    assert parsed.tzinfo is not None
    assert parsed.utcoffset() == timedelta(hours=8)
    assert abs((now - parsed).total_seconds()) < 5


