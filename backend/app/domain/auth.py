from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class User:
    id: int
    username: str


@dataclass(frozen=True)
class StoredUser:
    id: int
    username: str
    password_hash: str
    password_salt: str


@dataclass(frozen=True)
class Session:
    id: int
    user_id: int
    token_hash: str
    expires_at: datetime
