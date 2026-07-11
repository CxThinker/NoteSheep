import json
from urllib.parse import quote

import pytest

from test_notebook_utils import login, make_client

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


