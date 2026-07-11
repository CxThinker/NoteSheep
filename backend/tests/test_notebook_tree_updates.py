import json
from urllib.parse import quote

import pytest

from test_notebook_utils import login, make_client

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
