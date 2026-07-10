from __future__ import annotations

import sqlite3

from app.domain.folder import DEFAULT_FOLDER_NAME, Folder
from app.infrastructure.database import SQLiteDatabase


class SQLiteFolderRepository:
    def __init__(self, database: SQLiteDatabase) -> None:
        self._database = database

    def ensure_default_folder(self, user_id: int) -> Folder:
        existing = self._get_by_name(user_id, DEFAULT_FOLDER_NAME)
        if existing is not None:
            return existing

        try:
            with self._database.connect() as connection:
                cursor = connection.execute(
                    """
                    INSERT INTO folders (user_id, name, sort_order)
                    VALUES (?, ?, ?)
                    """,
                    (user_id, DEFAULT_FOLDER_NAME, 0),
                )
                folder_id = int(cursor.lastrowid)
        except sqlite3.IntegrityError:
            existing_after_race = self._get_by_name(user_id, DEFAULT_FOLDER_NAME)
            if existing_after_race is not None:
                return existing_after_race
            raise

        return Folder(id=folder_id, name=DEFAULT_FOLDER_NAME, sort_order=0)

    def list_for_user(self, user_id: int) -> list[Folder]:
        with self._database.connect() as connection:
            rows = connection.execute(
                """
                SELECT id, name, sort_order
                FROM folders
                WHERE user_id = ?
                ORDER BY sort_order ASC, id ASC
                """,
                (user_id,),
            ).fetchall()
        return [
            Folder(id=int(row["id"]), name=str(row["name"]), sort_order=int(row["sort_order"]))
            for row in rows
        ]

    def _get_by_name(self, user_id: int, name: str) -> Folder | None:
        with self._database.connect() as connection:
            row = connection.execute(
                """
                SELECT id, name, sort_order
                FROM folders
                WHERE user_id = ?
                  AND name = ?
                """,
                (user_id, name),
            ).fetchone()
        if row is None:
            return None
        return Folder(id=int(row["id"]), name=str(row["name"]), sort_order=int(row["sort_order"]))
