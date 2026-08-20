"""Auth helpers: password hashing, httpOnly cookie sessions (JWT), role guards."""

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from fastapi import Cookie, HTTPException, Response
from passlib.context import CryptContext

from lib.db import db

SESSION_COOKIE = "fd_session"
SECRET = os.environ.get("SESSION_SECRET", "freedive-dev-secret-change-me")
ALGO = "HS256"
SESSION_DAYS = 30

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(raw: str) -> str:
    return pwd_context.hash(raw)


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(raw, hashed)
    except ValueError:
        return False


def set_session_cookie(response: Response, user_id: str) -> None:
    exp = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    token = jwt.encode({"sub": user_id, "exp": exp}, SECRET, algorithm=ALGO)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=SESSION_DAYS * 86400,
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")


async def optional_user(fd_session: Optional[str] = Cookie(default=None)) -> Optional[dict[str, Any]]:
    if not fd_session:
        return None
    try:
        payload = jwt.decode(fd_session, SECRET, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    return user


async def current_user(fd_session: Optional[str] = Cookie(default=None)) -> dict[str, Any]:
    user = await optional_user(fd_session)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


def require_roles(*roles: str):
    async def guard(fd_session: Optional[str] = Cookie(default=None)) -> dict[str, Any]:
        user = await current_user(fd_session)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user

    return guard


async def assert_can_view(viewer: dict[str, Any], target_user_id: str) -> None:
    """Data isolation: self, admin, or an instructor assigned to that student."""
    if viewer["id"] == target_user_id or viewer["role"] == "admin":
        return
    if viewer["role"] == "instructor":
        link = await db.instructor_students.find_one(
            {"instructor_id": viewer["id"], "student_id": target_user_id}
        )
        if link:
            return
    raise HTTPException(status_code=403, detail="Forbidden")
