from __future__ import annotations

import secrets


class SecretsTokenGenerator:
    def make_token(self) -> str:
        return secrets.token_urlsafe(32)
