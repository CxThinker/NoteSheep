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
