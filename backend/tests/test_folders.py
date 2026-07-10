import sqlite3

from fastapi.testclient import TestClient

from app.main import create_app


def make_client(tmp_path):
    database_path = tmp_path / "notesheep.sqlite"
    app = create_app(database_path=database_path, session_secure=False)
    return TestClient(app), database_path


def test_migrations_create_folder_table(tmp_path):
    _, database_path = make_client(tmp_path)

    with sqlite3.connect(database_path) as connection:
        table_names = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }

    assert "alembic_version" in table_names
    assert "users" in table_names
    assert "sessions" in table_names
    assert "folders" in table_names


def test_register_creates_default_notebook_folder(tmp_path):
    client, database_path = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "folder-user", "password": "secret1"})

    with sqlite3.connect(database_path) as connection:
        row = connection.execute(
            """
            SELECT folders.name
            FROM folders
            JOIN users ON users.id = folders.user_id
            WHERE users.username = ?
            """,
            ("folder-user",),
        ).fetchone()

    assert row == ("笔记本1",)


def test_folders_require_login(tmp_path):
    client, _ = make_client(tmp_path)

    response = client.get("/api/folders")

    assert response.status_code == 401


def test_logged_in_user_sees_default_notebook_folder(tmp_path):
    client, _ = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "reader", "password": "secret1"})
    client.post("/api/auth/login", json={"username": "reader", "password": "secret1"})
    response = client.get("/api/folders")

    assert response.status_code == 200
    assert response.json() == {"folders": [{"id": 1, "name": "笔记本1", "sortOrder": 0}]}


def test_existing_user_without_folders_gets_default_folder(tmp_path):
    client, database_path = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "repaired", "password": "secret1"})
    with sqlite3.connect(database_path) as connection:
        connection.execute("DELETE FROM folders")
        connection.commit()

    client.post("/api/auth/login", json={"username": "repaired", "password": "secret1"})
    response = client.get("/api/folders")

    assert response.status_code == 200
    assert response.json()["folders"][0]["name"] == "笔记本1"


def test_default_folders_are_scoped_by_user(tmp_path):
    client, database_path = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "first", "password": "secret1"})
    client.post("/api/auth/register", json={"username": "second", "password": "secret1"})

    with sqlite3.connect(database_path) as connection:
        rows = connection.execute(
            """
            SELECT users.username, folders.name
            FROM folders
            JOIN users ON users.id = folders.user_id
            ORDER BY users.username
            """
        ).fetchall()

    assert rows == [("first", "笔记本1"), ("second", "笔记本1")]
