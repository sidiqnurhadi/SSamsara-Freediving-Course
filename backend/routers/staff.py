from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import assert_can_view, current_user, require_roles
from lib.db import db
from lib.disciplines import DEPTH
from models.schemas import (
    AdminOverview,
    AdminUserUpdate,
    InstructorNote,
    InstructorNoteInput,
    OkResult,
    StudentSummary,
    UserPublic,
    new_id,
    now_utc,
)

router = APIRouter(tags=["staff"])
instructor_or_admin = require_roles("instructor", "admin")
admin_only = require_roles("admin")


def _public(user: dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=user["id"],
        name=user["name"],
        email=user["email"],
        role=user["role"],
        profile_photo=user.get("profile_photo"),
    )


# ---------------- instructor ----------------
@router.get("/instructor/students", response_model=list[StudentSummary])
async def my_students(viewer: dict[str, Any] = Depends(instructor_or_admin)):
    if viewer["role"] == "admin":
        students = await db.users.find({"role": "student"}, {"_id": 0}).to_list(500)
    else:
        links = await db.instructor_students.find(
            {"instructor_id": viewer["id"]}, {"_id": 0}
        ).to_list(500)
        ids = [link["student_id"] for link in links]
        students = await db.users.find({"id": {"$in": ids}}, {"_id": 0}).to_list(500)

    out: list[StudentSummary] = []
    for student in students:
        pbs = await db.personal_bests.find(
            {"user_id": student["id"], "discipline": {"$in": DEPTH}}, {"_id": 0}
        ).to_list(50)
        best = max(pbs, key=lambda p: p["value"]) if pbs else None
        goal = await db.goals.find_one(
            {"user_id": student["id"], "status": "active"}, {"_id": 0}
        )
        profile = await db.diver_profiles.find_one({"user_id": student["id"]}, {"_id": 0})
        last = await db.training_entries.find({"user_id": student["id"]}, {"_id": 0}).to_list(500)
        last_date = max((e["date"] for e in last), default=None)
        out.append(
            StudentSummary(
                user=_public(student),
                certification=(profile or {}).get("certification_summary"),
                depth_pb=best["value"] if best else None,
                depth_discipline=best["discipline"] if best else None,
                target=goal["target_value"] if goal else None,
                last_training_date=last_date,
            )
        )
    return out


@router.get("/instructor/notes", response_model=list[InstructorNote])
async def list_notes(student_id: str, viewer: dict[str, Any] = Depends(current_user)):
    await assert_can_view(viewer, student_id)
    docs = await db.instructor_notes.find({"student_id": student_id}, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: d.get("created_at") or "", reverse=True)
    return [InstructorNote(**d) for d in docs]


@router.post("/instructor/notes", response_model=InstructorNote)
async def add_note(
    payload: InstructorNoteInput, viewer: dict[str, Any] = Depends(instructor_or_admin)
):
    await assert_can_view(viewer, payload.student_id)
    note = InstructorNote(
        id=new_id(),
        instructor_id=viewer["id"],
        instructor_name=viewer["name"],
        student_id=payload.student_id,
        note=payload.note,
    )
    await db.instructor_notes.insert_one(note.model_dump())
    return note


# ---------------- admin ----------------
@router.get("/admin/overview", response_model=AdminOverview)
async def admin_overview(_: dict[str, Any] = Depends(admin_only)):
    users = await db.users.find({}, {"_id": 0}).to_list(2000)
    users.sort(key=lambda u: u.get("created_at") or now_utc(), reverse=True)
    return AdminOverview(
        total_users=len(users),
        total_students=sum(1 for u in users if u["role"] == "student"),
        total_instructors=sum(1 for u in users if u["role"] == "instructor"),
        active_courses=await db.courses.count_documents({"status": "active"}),
        total_dive_logs=await db.dive_logs.count_documents({}),
        total_training_sessions=await db.training_entries.count_documents({}),
        total_resources=await db.learning_resources.count_documents({}),
        recent_registrations=[_public(u) for u in users[:6]],
    )


@router.get("/admin/users", response_model=list[UserPublic])
async def admin_users(_: dict[str, Any] = Depends(admin_only)):
    users = await db.users.find({}, {"_id": 0}).to_list(2000)
    users.sort(key=lambda u: u["name"])
    return [_public(u) for u in users]


@router.patch("/admin/users/{user_id}", response_model=UserPublic)
async def admin_update_user(
    user_id: str, payload: AdminUserUpdate, _: dict[str, Any] = Depends(admin_only)
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")
    res = await db.users.update_one({"id": user_id}, {"$set": {**updates, "updated_at": now_utc()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    assert user is not None
    return _public(user)


@router.delete("/admin/users/{user_id}", response_model=OkResult)
async def admin_delete_user(user_id: str, viewer: dict[str, Any] = Depends(admin_only)):
    if user_id == viewer["id"]:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    for collection in (
        db.diver_profiles,
        db.dive_logs,
        db.personal_bests,
        db.goals,
        db.training_entries,
        db.certifications,
    ):
        await collection.delete_many({"user_id": user_id})
    return OkResult()
