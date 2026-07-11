from urllib.parse import quote

from test_notebook_utils import login, make_client


def test_notebook_lifecycle_requires_login(tmp_path):
    client, _ = make_client(tmp_path)

    assert client.get("/api/notebooks/deleted").status_code == 401
    assert client.delete(f"/api/notebooks/{quote('笔记本1')}").status_code == 401
    assert client.post("/api/notebooks/deleted/missing/restore").status_code == 401
    assert client.delete("/api/notebooks/deleted/missing").status_code == 401


def test_delete_and_restore_notebook_preserves_files(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})

    delete_response = client.delete(f"/api/notebooks/{quote('笔记本1')}")

    assert delete_response.status_code == 200
    deleted = delete_response.json()["notebook"]
    assert deleted["name"] == "笔记本1"
    assert deleted["id"]
    assert not (notes_root / "笔记本1").exists()
    assert client.get("/api/notebooks").json() == {"notebooks": []}
    assert client.get("/api/notebooks/deleted").json() == {"notebooks": [deleted]}

    restore_response = client.post(f"/api/notebooks/deleted/{quote(deleted['id'])}/restore")

    assert restore_response.status_code == 200
    assert restore_response.json() == {"notebook": {"name": "笔记本1"}}
    assert (notes_root / "笔记本1" / "note" / "tree.json").is_file()
    assert (notes_root / "笔记本1" / "note" / "节点一.md").is_file()
    assert client.get("/api/notebooks/deleted").json() == {"notebooks": []}


def test_restore_deleted_notebook_rejects_duplicate_active_name(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    deleted = client.delete(f"/api/notebooks/{quote('笔记本1')}").json()["notebook"]
    client.post("/api/notebooks", json={"name": "笔记本1"})

    response = client.post(f"/api/notebooks/deleted/{quote(deleted['id'])}/restore")

    assert response.status_code == 409
    assert client.get("/api/notebooks/deleted").json() == {"notebooks": [deleted]}


def test_permanent_delete_removes_deleted_notebook_files(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    deleted = client.delete(f"/api/notebooks/{quote('笔记本1')}").json()["notebook"]

    response = client.delete(f"/api/notebooks/deleted/{quote(deleted['id'])}")

    assert response.status_code == 204
    assert client.get("/api/notebooks/deleted").json() == {"notebooks": []}
    assert not (notes_root / ".notesheep-trash" / deleted["id"]).exists()
