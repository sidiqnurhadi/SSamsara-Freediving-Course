import secrets
from typing import Any, Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response

from lib.auth import (
    clear_session_cookie,
    current_user,
    hash_password,
    optional_user,
    set_session_cookie,
    verify_password,
)
from lib.db import db
from models.schemas import (
    DiverProfile,
    ForgotPasswordInput,
    ForgotPasswordResult,
    LoginInput,
    OkResult,
    RegisterInput,
    ResetPasswordInput,
    UserPublic,
    new_id,
    now_utc,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def to_public(user: dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        profile_photo=user.get("profile_photo"),
    )


@router.post("/register", response_model=UserPublic)
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = {
        "id": new_id(),
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "student",
        "profile_photo": None,
        "created_at": now_utc(),
        "updated_at": now_utc(),
    }
    await db.users.insert_one(dict(user))
    await db.diver_profiles.insert_one(
        DiverProfile(user_id=user["id"], name=user["name"], email=email).model_dump()
    )
    set_session_cookie(response, user["id"])
    return to_public(user)


@router.post("/login", response_model=UserPublic)
async def login(payload: LoginInput, response: Response):
    user = await db.users.find_one({"email": payload.email.lower().strip()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    set_session_cookie(response, user["id"])
    return to_public(user)


@router.post("/logout", response_model=OkResult)
async def logout(response: Response):
    clear_session_cookie(response)
    return OkResult()


@router.get("/me", response_model=Optional[UserPublic])
async def me(fd_session: Optional[str] = Cookie(default=None)):
    user = await optional_user(fd_session)
    return to_public(user) if user else None


@router.post("/forgot-password", response_model=ForgotPasswordResult)
async def forgot_password(payload: ForgotPasswordInput):
    user = await db.users.find_one({"email": payload.email.lower().strip()})
    if not user:
        # do not disclose whether the account exists
        return ForgotPasswordResult(message="If that account exists, a reset link has been issued.")
    token = secrets.token_urlsafe(24)
    await db.password_resets.insert_one(
        {"id": new_id(), "user_id": user["id"], "token": token, "created_at": now_utc()}
    )
    # No mail provider is configured in this MVP, so the token is returned for in-app reset.
    return ForgotPasswordResult(
        reset_token=token, message="Use this reset token to set a new password."
    )


@router.post("/reset-password", response_model=OkResult)
async def reset_password(payload: ResetPasswordInput):
    entry = await db.password_resets.find_one({"token": payload.token})
    if not entry:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    await db.users.update_one(
        {"id": entry["user_id"]},
        {"$set": {"password_hash": hash_password(payload.password), "updated_at": now_utc()}},
    )
    await db.password_resets.delete_many({"user_id": entry["user_id"]})
    return OkResult()


@router.get("/session-check", response_model=OkResult)
async def session_check(user: dict[str, Any] = Depends(current_user)):
    return OkResult(ok=bool(user))
