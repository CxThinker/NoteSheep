from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Protocol

from app.domain.auth import StoredUser, User


class AuthError(Exception):
    pass


class DuplicateUsernameError(AuthError):
    pass


class InvalidCredentialsError(AuthError):
    pass


class PasswordTooShortError(AuthError):
    pass


class UserRepository(Protocol):
    def create_user(self, username: str, password_hash: str, password_salt: str) -> User:
        ...

    def get_by_username(self, username: str) -> StoredUser | None:
        ...

    def get_by_id(self, user_id: int) -> User | None:
        ...


class SessionRepository(Protocol):
    def create_session(self, user_id: int, token_hash: str, expires_at: datetime) -> None:
        ...

    def get_user_id(self, token_hash: str, now: datetime) -> int | None:
        ...

    def delete_session(self, token_hash: str) -> None:
        ...


class PasswordHasher(Protocol):
    def make_salt(self) -> str:
        ...

    def hash_password(self, password: str, salt: str) -> str:
        ...

    def verify_password(self, password: str, salt: str, expected_hash: str) -> bool:
        ...


class TokenGenerator(Protocol):
    def make_token(self) -> str:
        ...


class AuthService:
    def __init__(
        self,
        users: UserRepository,
        sessions: SessionRepository,
        password_hasher: PasswordHasher,
        token_generator: TokenGenerator,
        session_days: int,
    ) -> None:
        self._users = users
        self._sessions = sessions
        self._password_hasher = password_hasher
        self._token_generator = token_generator
        self._session_days = session_days

    def register(self, username: str, password: str) -> User:
        clean_username = self._normalize_username(username)
        self._validate_password(password)
        salt = self._password_hasher.make_salt()
        password_hash = self._password_hasher.hash_password(password, salt)
        return self._users.create_user(clean_username, password_hash, salt)

    def login(self, username: str, password: str) -> tuple[User, str]:
        clean_username = self._normalize_username(username)
        stored_user = self._users.get_by_username(clean_username)
        if stored_user is None:
            raise InvalidCredentialsError()
        if not self._password_hasher.verify_password(
            password,
            stored_user.password_salt,
            stored_user.password_hash,
        ):
            raise InvalidCredentialsError()

        token = self._token_generator.make_token()
        token_hash = hash_token(token)
        expires_at = datetime.now(timezone.utc) + timedelta(days=self._session_days)
        self._sessions.create_session(stored_user.id, token_hash, expires_at)
        return User(id=stored_user.id, username=stored_user.username), token

    def current_user(self, token: str | None) -> User | None:
        if not token:
            return None
        user_id = self._sessions.get_user_id(hash_token(token), datetime.now(timezone.utc))
        if user_id is None:
            return None
        return self._users.get_by_id(user_id)

    def logout(self, token: str | None) -> None:
        if token:
            self._sessions.delete_session(hash_token(token))

    def _normalize_username(self, username: str) -> str:
        clean_username = username.strip()
        if not clean_username:
            raise InvalidCredentialsError()
        return clean_username

    def _validate_password(self, password: str) -> None:
        if len(password) < 6:
            raise PasswordTooShortError()


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
