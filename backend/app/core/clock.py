from __future__ import annotations

from datetime import datetime, timedelta, timezone


BEIJING_TIMEZONE = timezone(timedelta(hours=8))


def now_beijing_iso() -> str:
    return datetime.now(BEIJING_TIMEZONE).isoformat(timespec="seconds")
