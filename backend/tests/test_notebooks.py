import json
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def make_client(tmp_path):
    database_path = tmp_path / "notesheep.sqlite"
    notes_root = tmp_path / "notes"
    app = create_app(
        database_path=database_path,
        notes_root=notes_root,
        session_secure=False,
    )
    return TestClient(app), notes_root


def login(client: TestClient) -> None:
    client.post("/api/auth/register", json={"username": "notebook-user", "password": "secret1"})
    client.post("/api/auth/login", json={"username": "notebook-user", "password": "secret1"})


def test_notes_root_is_created(tmp_path):
    _, notes_root = make_client(tmp_path)

    assert notes_root.is_dir()


def test_notebooks_require_login(tmp_path):
    client, _ = make_client(tmp_path)

    response = client.get("/api/notebooks")

    assert response.status_code == 401


def test_create_notebook_creates_project_structure(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)

    response = client.post("/api/notebooks", json={"name": "笔记本1"})

    assert response.status_code == 201
    assert response.json() == {"notebook": {"name": "笔记本1"}}
    assert (notes_root / "笔记本1" / "note").is_dir()
    assert (notes_root / "笔记本1" / "voice").is_dir()
    assert (notes_root / "笔记本1" / "img").is_dir()
    assert json.loads((notes_root / "笔记本1" / "note" / "tree.json").read_text("utf-8")) == {
        "rootId": None,
        "nodes": [],
        "edges": [],
    }


def test_list_notebooks_reads_only_tree_backed_notebooks(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    for child in ("note", "voice", "img"):
        (notes_root / "笔记本1" / child).mkdir(parents=True, exist_ok=True)
    (notes_root / "笔记本1" / "note" / "tree.json").write_text(
        json.dumps({"rootId": None, "nodes": [], "edges": []}),
        encoding="utf-8",
    )
    for child in ("note", "voice", "img"):
        (notes_root / "旧笔记目录" / child).mkdir(parents=True, exist_ok=True)
    (notes_root / ".gitkeep").write_text("", encoding="utf-8")

    response = client.get("/api/notebooks")

    assert response.status_code == 200
    assert response.json() == {"notebooks": [{"name": "笔记本1"}]}


def test_create_notebook_rejects_duplicate_name(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)

    first_response = client.post("/api/notebooks", json={"name": "笔记本1"})
    duplicate_response = client.post("/api/notebooks", json={"name": "笔记本1"})

    assert first_response.status_code == 201
    assert duplicate_response.status_code == 409


@pytest.mark.parametrize(
    "name",
    ["", "   ", "../escape", "a/b", "a\\b", "bad:name", "CON", "nul.txt", "笔记本."],
)
def test_create_notebook_rejects_invalid_names(tmp_path, name):
    client, _ = make_client(tmp_path)
    login(client)

    response = client.post("/api/notebooks", json={"name": name})

    assert response.status_code == 400


def test_rename_notebook_preserves_tree_and_node_files(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})

    response = client.patch(f"/api/notebooks/{quote('笔记本1')}", json={"name": "笔记本2"})

    assert response.status_code == 200
    assert response.json() == {"notebook": {"name": "笔记本2"}}
    assert not (notes_root / "笔记本1").exists()
    assert (notes_root / "笔记本2" / "note" / "tree.json").is_file()
    assert (notes_root / "笔记本2" / "note" / "节点一.md").is_file()


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
    assert payload["tree"]["rootId"] == "__notesheep_notebook_root__"
    assert payload["tree"]["edges"] == [
        {
            "from": "__notesheep_notebook_root__",
            "to": payload["node"]["id"],
            "side": "right",
            "order": 0,
        }
    ]
    assert (notes_root / "笔记本1" / "note" / "节点一.md").read_text("utf-8") == ""
    assert (notes_root / "笔记本1" / "voice" / "节点一").is_dir()
    assert (notes_root / "笔记本1" / "img" / "节点一").is_dir()

    tree = json.loads((notes_root / "笔记本1" / "note" / "tree.json").read_text("utf-8"))
    assert tree == payload["tree"]


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
    root_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
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


def test_create_node_without_parent_after_root_links_to_notebook_root(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    root_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    root_id = root_response.json()["node"]["id"]

    response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点二"})

    assert response.status_code == 201
    assert response.json()["tree"]["edges"] == [
        {"from": "__notesheep_notebook_root__", "to": root_id, "side": "right", "order": 0},
        {
            "from": "__notesheep_notebook_root__",
            "to": response.json()["node"]["id"],
            "side": "right",
            "order": 1,
        },
    ]


def test_create_node_with_notebook_root_parent_records_top_level_edge(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    first_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
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


def test_get_notebook_tree_normalizes_legacy_edges(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    root_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    child_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点二"})
    root_id = root_response.json()["node"]["id"]
    child_id = child_response.json()["node"]["id"]
    tree_path = notes_root / "笔记本1" / "note" / "tree.json"
    legacy_tree = json.loads(tree_path.read_text("utf-8"))
    legacy_tree["rootId"] = root_id
    legacy_tree["edges"] = [{"from": root_id, "to": child_id}]
    tree_path.write_text(json.dumps(legacy_tree), encoding="utf-8")

    response = client.get(f"/api/notebooks/{quote('笔记本1')}/tree")

    assert response.status_code == 200
    assert response.json()["tree"]["rootId"] == "__notesheep_notebook_root__"
    assert response.json()["tree"]["edges"] == [
        {"from": "__notesheep_notebook_root__", "to": root_id, "side": "right", "order": 0},
        {"from": root_id, "to": child_id, "side": "right", "order": 0}
    ]


def test_update_notebook_tree_saves_ordered_sides(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    root_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "中心"})
    left_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "左侧"})
    right_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "右侧"})
    tree = right_response.json()["tree"]
    root_id = root_response.json()["node"]["id"]
    left_id = left_response.json()["node"]["id"]
    right_id = right_response.json()["node"]["id"]
    tree["edges"] = [
        {"from": "__notesheep_notebook_root__", "to": root_id, "side": "right", "order": 0},
        {"from": root_id, "to": left_id, "side": "left", "order": 0},
        {"from": root_id, "to": right_id, "side": "right", "order": 0},
    ]

    response = client.put(f"/api/notebooks/{quote('笔记本1')}/tree", json={"tree": tree})

    assert response.status_code == 200
    assert response.json()["tree"]["edges"] == tree["edges"]
    saved_tree = json.loads((notes_root / "笔记本1" / "note" / "tree.json").read_text("utf-8"))
    assert saved_tree["edges"] == tree["edges"]


def test_update_notebook_tree_rejects_cycles(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    root_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "中心"})
    child_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "子节点"})
    tree = child_response.json()["tree"]
    root_id = root_response.json()["node"]["id"]
    child_id = child_response.json()["node"]["id"]
    tree["edges"] = [
        {"from": root_id, "to": child_id, "side": "right", "order": 0},
        {"from": child_id, "to": root_id, "side": "right", "order": 0},
    ]

    response = client.put(f"/api/notebooks/{quote('笔记本1')}/tree", json={"tree": tree})

    assert response.status_code == 400
    assert response.json()["detail"] == "Notebook tree is invalid."


def test_update_notebook_tree_rejects_missing_nodes(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    root_response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "中心"})
    tree = root_response.json()["tree"]
    tree["edges"] = [
        {"from": root_response.json()["node"]["id"], "to": "missing-node", "side": "right", "order": 0}
    ]

    response = client.put(f"/api/notebooks/{quote('笔记本1')}/tree", json={"tree": tree})

    assert response.status_code == 400
    assert response.json()["detail"] == "Notebook tree is invalid."
