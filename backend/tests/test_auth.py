import sqlite3

from fastapi.testclient import TestClient

from app.main import create_app


def make_client(tmp_path):
    database_path = tmp_path / "notesheep.sqlite"
    app = create_app(database_path=database_path, session_secure=False)
    return TestClient(app), database_path


def test_register_login_and_current_user(tmp_path):
    client, _ = make_client(tmp_path)

    register_response = client.post(
        "/api/auth/register",
        json={"username": "shepherd", "password": "secret1"},
    )
    assert register_response.status_code == 201
    assert register_response.json() == {"user": {"id": 1, "username": "shepherd"}}

    login_response = client.post(
        "/api/auth/login",
        json={"username": "shepherd", "password": "secret1"},
    )
    assert login_response.status_code == 200
    assert login_response.json() == {"user": {"id": 1, "username": "shepherd"}}
    assert "notesheep_session" in login_response.cookies

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 200
    assert me_response.json() == {"user": {"id": 1, "username": "shepherd"}}


def test_register_rejects_short_password(tmp_path):
    client, _ = make_client(tmp_path)

    response = client.post(
        "/api/auth/register",
        json={"username": "shorty", "password": "12345"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Password must be at least 6 characters."


def test_register_rejects_duplicate_username(tmp_path):
    client, _ = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "same", "password": "secret1"})
    response = client.post(
        "/api/auth/register",
        json={"username": "same", "password": "secret2"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "Username is already registered."


def test_login_rejects_wrong_password(tmp_path):
    client, _ = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "honest", "password": "secret1"})
    response = client.post(
        "/api/auth/login",
        json={"username": "honest", "password": "wrongpass"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."


def test_sql_injection_payload_does_not_bypass_login(tmp_path):
    client, _ = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "owner", "password": "secret1"})
    response = client.post(
        "/api/auth/login",
        json={"username": "owner' OR '1'='1", "password": "anything"},
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password."


def test_database_does_not_store_plaintext_password(tmp_path):
    client, database_path = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "private", "password": "secret1"})

    with sqlite3.connect(database_path) as connection:
        row = connection.execute(
            "SELECT password_hash, password_salt FROM users WHERE username = ?",
            ("private",),
        ).fetchone()

    assert row is not None
    assert row[0] != "secret1"
    assert row[1] != "secret1"
    assert len(row[0]) >= 64
    assert len(row[1]) >= 32


def test_logout_clears_session(tmp_path):
    client, _ = make_client(tmp_path)

    client.post("/api/auth/register", json={"username": "bye", "password": "secret1"})
    client.post("/api/auth/login", json={"username": "bye", "password": "secret1"})

    logout_response = client.post("/api/auth/logout")
    assert logout_response.status_code == 204

    me_response = client.get("/api/auth/me")
    assert me_response.status_code == 401
