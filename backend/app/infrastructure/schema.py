from __future__ import annotations

from sqlalchemy import (
    Column,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    UniqueConstraint,
    text,
)


metadata = MetaData()


users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("username", String, nullable=False, unique=True),
    Column("password_hash", String, nullable=False),
    Column("password_salt", String, nullable=False),
    Column("created_at", String, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", String, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)


sessions = Table(
    "sessions",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("token_hash", String, nullable=False, unique=True),
    Column("expires_at", String, nullable=False),
    Column("created_at", String, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
)


folders = Table(
    "folders",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
    Column("name", String, nullable=False),
    Column("sort_order", Integer, nullable=False, server_default=text("0")),
    Column("created_at", String, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    Column("updated_at", String, nullable=False, server_default=text("CURRENT_TIMESTAMP")),
    UniqueConstraint("user_id", "name", name="uq_folders_user_name"),
)
