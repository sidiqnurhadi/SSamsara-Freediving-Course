from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from lib.access import sync_profile_level
from lib.auth import assert_can_view, current_user, require_roles
from lib.db import db
from lib.disciplines import DEPTH
from lib.levels import rank_of
from models.schemas import (
    AdminCertificationInput,
    AdminCertificationUpdate,
    AdminOverview,
    AdminUserUpdate,
    Certification,
    InstructorNote,
    InstructorNoteInput,
    OkResult,
    StudentSummary,
    UserPublic,
    new_id,
    now_utc,
)

router = APIRouter(tags=["staff"])
instructor_or_admin = require_roles("instructor", "admin", "super_admin")
admin_only = require_roles("admin", "super_admin")


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
    if viewer["role"] in {"admin", "super_admin"}:
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


# ---------------- admin: certification management ----------------
@router.get("/admin/certifications", response_model=list[Certification])
async def admin_certifications(
    user_id: Optional[str] = None, _: dict[str, Any] = Depends(admin_only)
):
    query: dict[str, Any] = {"user_id": user_id} if user_id else {}
    docs = await db.certifications.find(query, {"_id": 0}).to_list(1000)
    names = {u["id"]: u["name"] for u in await db.users.find({}, {"_id": 0}).to_list(2000)}
    out: list[Certification] = []
    for doc in docs:
        out.append(
            Certification(
                id=doc["id"],
                user_id=doc["user_id"],
                user_name=names.get(doc["user_id"], doc.get("user_name", "")),
                agency=doc["agency"],
                certification=doc["certification"],
                instructor=doc.get("instructor"),
                certification_date=doc.get("certification_date"),
                expiration_date=doc.get("expiration_date"),
                certificate_number=doc.get("certificate_number"),
                certificate_file_url=doc.get("certificate_file_url"),
                status=doc.get("status") or "verified",
                rank=rank_of(doc.get("agency"), doc.get("certification")) or 0,
            )
        )
    out.sort(key=lambda c: (c.user_name, -c.rank))
    return out


@router.post("/admin/certifications", response_model=Certification)
async def admin_assign_certification(
    payload: AdminCertificationInput, _: dict[str, Any] = Depends(admin_only)
):
    user = await db.users.find_one({"id": payload.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if rank_of(payload.agency, payload.certification) is None:
        raise HTTPException(status_code=422, detail="Unknown certification level for that agency")
    doc = {
        "id": new_id(),
        "user_name": user["name"],
        **payload.model_dump(),
        "expiration_date": None,
        "certificate_file_url": None,
        "created_at": now_utc(),
    }
    await db.certifications.insert_one(dict(doc))
    # learning access follows immediately — no per-resource permission editing
    await sync_profile_level(payload.user_id)
    return Certification(
        **{**doc, "rank": rank_of(payload.agency, payload.certification) or 0}
    )


@router.patch("/admin/certifications/{cert_id}", response_model=Certification)
async def admin_update_certification(
    cert_id: str, payload: AdminCertificationUpdate, _: dict[str, Any] = Depends(admin_only)
):
    existing = await db.certifications.find_one({"id": cert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Certification not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")
    doc = {**existing, **updates}
    if rank_of(doc.get("agency"), doc.get("certification")) is None:
        raise HTTPException(status_code=422, detail="Unknown certification level for that agency")
    await db.certifications.update_one({"id": cert_id}, {"$set": {**updates, "updated_at": now_utc()}})
    await sync_profile_level(doc["user_id"])
    return Certification(
        **{
            **doc,
            "status": doc.get("status") or "verified",
            "rank": rank_of(doc.get("agency"), doc.get("certification")) or 0,
        }
    )


@router.delete("/admin/certifications/{cert_id}", response_model=OkResult)
async def admin_delete_certification(cert_id: str, _: dict[str, Any] = Depends(admin_only)):
    existing = await db.certifications.find_one({"id": cert_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Certification not found")
    await db.certifications.delete_one({"id": cert_id})
    await sync_profile_level(existing["user_id"])
    return OkResult()
