from __future__ import annotations

import hashlib
import hmac
import secrets


class PBKDF2PasswordHasher:
    def __init__(self, iterations: int = 200_000) -> None:
        self._iterations = iterations

    def make_salt(self) -> str:
        return secrets.token_hex(32)

    def hash_password(self, password: str, salt: str) -> str:
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            self._iterations,
        )
        return digest.hex()

    def verify_password(self, password: str, salt: str, expected_hash: str) -> bool:
        actual_hash = self.hash_password(password, salt)
        return hmac.compare_digest(actual_hash, expected_hash)
