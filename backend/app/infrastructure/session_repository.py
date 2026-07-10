from __future__ import annotations

from datetime import datetime

from app.infrastructure.database import SQLiteDatabase


class SQLiteSessionRepository:
    def __init__(self, database: SQLiteDatabase) -> None:
        self._database = database

    def create_session(self, user_id: int, token_hash: str, expires_at: datetime) -> None:
        with self._database.connect() as connection:
            connection.execute(
                """
                INSERT INTO sessions (user_id, token_hash, expires_at)
                VALUES (?, ?, ?)
                """,
                (user_id, token_hash, expires_at.isoformat()),
            )

    def get_user_id(self, token_hash: str, now: datetime) -> int | None:
        with self._database.connect() as connection:
            row = connection.execute(
                """
                SELECT user_id
                FROM sessions
                WHERE token_hash = ?
                  AND expires_at > ?
                """,
                (token_hash, now.isoformat()),
            ).fetchone()
        if row is None:
            return None
        return int(row["user_id"])

    def delete_session(self, token_hash: str) -> None:
        with self._database.connect() as connection:
            connection.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (token_hash,),
            )
