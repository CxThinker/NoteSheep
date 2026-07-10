from __future__ import annotations

import sqlite3

from app.application.auth_service import DuplicateUsernameError
from app.domain.auth import StoredUser, User
from app.infrastructure.database import SQLiteDatabase


class SQLiteUserRepository:
    def __init__(self, database: SQLiteDatabase) -> None:
        self._database = database

    def create_user(self, username: str, password_hash: str, password_salt: str) -> User:
        try:
            with self._database.connect() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO users (username, password_hash, password_salt)
                    VALUES (?, ?, ?)
                    """,
                    (username, password_hash, password_salt),
                )
                user_id = int(cursor.lastrowid)
        except sqlite3.IntegrityError as error:
            if "UNIQUE" in str(error).upper():
                raise DuplicateUsernameError() from error
            raise
        return User(id=user_id, username=username)

    def get_by_username(self, username: str) -> StoredUser | None:
        with self._database.connect() as connection:
            row = connection.execute(
                """
                SELECT id, username, password_hash, password_salt
                FROM users
                WHERE username = ?
                """,
                (username,),
            ).fetchone()
        if row is None:
            return None
        return StoredUser(
            id=int(row["id"]),
            username=str(row["username"]),
            password_hash=str(row["password_hash"]),
            password_salt=str(row["password_salt"]),
        )

    def get_by_id(self, user_id: int) -> User | None:
        with self._database.connect() as connection:
            row = connection.execute(
                """
                SELECT id, username
                FROM users
                WHERE id = ?
                """,
                (user_id,),
            ).fetchone()
        if row is None:
            return None
        return User(id=int(row["id"]), username=str(row["username"]))
