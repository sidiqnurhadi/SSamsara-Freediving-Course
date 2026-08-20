"""Server-anchored dates. The pod clock is UTC."""

from datetime import datetime, timedelta, timezone


def today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def days_ago_str(days: int) -> str:
    return (datetime.now(timezone.utc).date() - timedelta(days=days)).isoformat()


def week_start_str() -> str:
    today = datetime.now(timezone.utc).date()
    return (today - timedelta(days=today.weekday())).isoformat()
