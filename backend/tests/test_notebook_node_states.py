import json
from urllib.parse import quote

from test_notebook_utils import login, make_client


def test_legacy_tree_defaults_node_state_lists(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})
    tree_path = notes_root / "笔记本1" / "note" / "tree.json"
    tree = json.loads(tree_path.read_text("utf-8"))
    tree.pop("freeNodeIds", None)
    tree.pop("deletedNodeIds", None)
    tree_path.write_text(json.dumps(tree, ensure_ascii=False), encoding="utf-8")

    response = client.get(f"/api/notebooks/{quote('笔记本1')}/tree")

    assert response.status_code == 200
    assert response.json()["tree"]["freeNodeIds"] == []
    assert response.json()["tree"]["deletedNodeIds"] == []


def test_create_node_without_parent_creates_free_node(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})

    response = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"})

    assert response.status_code == 201
    payload = response.json()
    assert payload["tree"]["edges"] == []
    assert payload["tree"]["freeNodeIds"] == [payload["node"]["id"]]
    assert payload["tree"]["deletedNodeIds"] == []


def test_update_tree_moves_nodes_between_trays_and_tree(tmp_path):
    client, _ = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    free = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "自由"}).json()
    deleted = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "删除"}).json()
    free_id = free["node"]["id"]
    deleted_id = deleted["node"]["id"]
    tree = deleted["tree"]
    tree["freeNodeIds"] = []
    tree["deletedNodeIds"] = [deleted_id]
    tree["edges"] = [
        {"from": "__notesheep_notebook_root__", "to": free_id, "side": "right", "order": 0}
    ]

    response = client.put(f"/api/notebooks/{quote('笔记本1')}/tree", json={"tree": tree})

    assert response.status_code == 200
    assert response.json()["tree"]["freeNodeIds"] == []
    assert response.json()["tree"]["deletedNodeIds"] == [deleted_id]
    assert response.json()["tree"]["edges"] == tree["edges"]


def test_permanent_delete_removes_deleted_node_files(tmp_path):
    client, notes_root = make_client(tmp_path)
    login(client)
    client.post("/api/notebooks", json={"name": "笔记本1"})
    created = client.post(f"/api/notebooks/{quote('笔记本1')}/nodes", json={"title": "节点一"}).json()
    node_id = created["node"]["id"]
    tree = created["tree"]
    tree["freeNodeIds"] = []
    tree["deletedNodeIds"] = [node_id]
    client.put(f"/api/notebooks/{quote('笔记本1')}/tree", json={"tree": tree})

    response = client.delete(f"/api/notebooks/{quote('笔记本1')}/nodes/{quote(node_id)}")

    assert response.status_code == 200
    assert response.json()["tree"]["nodes"] == []
    assert not (notes_root / "笔记本1" / "note" / "节点一.md").exists()
    assert not (notes_root / "笔记本1" / "img" / "节点一").exists()
    assert not (notes_root / "笔记本1" / "voice" / "节点一").exists()
