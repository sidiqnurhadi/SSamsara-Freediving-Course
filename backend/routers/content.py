from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import assert_can_view, current_user, require_roles
from lib.db import db
from models.schemas import (
    Certification,
    CertificationInput,
    DiverProfile,
    DiverProfileUpdate,
    LearningResource,
    LearningResourceInput,
    OkResult,
    new_id,
    now_utc,
)

router = APIRouter(tags=["content"])
admin_only = require_roles("admin")


# ---------------- diver profile ----------------
@router.get("/profile", response_model=DiverProfile)
async def get_profile(user_id: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    doc = await db.diver_profiles.find_one({"user_id": target}, {"_id": 0})
    if not doc:
        user = await db.users.find_one({"id": target}, {"_id": 0})
        profile = DiverProfile(
            user_id=target,
            name=(user or {}).get("name", ""),
            email=(user or {}).get("email", ""),
        )
        await db.diver_profiles.insert_one(profile.model_dump())
        return profile
    return DiverProfile(**doc)


@router.put("/profile", response_model=DiverProfile)
async def update_profile(payload: DiverProfileUpdate, viewer: dict[str, Any] = Depends(current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if "name" in updates:
        await db.users.update_one(
            {"id": viewer["id"]}, {"$set": {"name": updates["name"], "updated_at": now_utc()}}
        )
    if "profile_photo" in updates:
        await db.users.update_one(
            {"id": viewer["id"]}, {"$set": {"profile_photo": updates["profile_photo"]}}
        )
    await db.diver_profiles.update_one(
        {"user_id": viewer["id"]},
        {"$set": {**updates, "email": viewer["email"], "updated_at": now_utc()}},
        upsert=True,
    )
    doc = await db.diver_profiles.find_one({"user_id": viewer["id"]}, {"_id": 0})
    assert doc is not None
    return DiverProfile(**doc)


# ---------------- learning resources ----------------
@router.get("/learning-resources", response_model=list[LearningResource])
async def list_resources(include_inactive: bool = False, viewer: dict[str, Any] = Depends(current_user)):
    query: dict[str, Any] = {}
    if not (include_inactive and viewer["role"] == "admin"):
        query["is_active"] = True
    docs = await db.learning_resources.find(query, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: (d.get("category", ""), d.get("title", "")))
    return [LearningResource(**d) for d in docs]


@router.post("/learning-resources", response_model=LearningResource)
async def create_resource(payload: LearningResourceInput, _: dict[str, Any] = Depends(admin_only)):
    resource = LearningResource(id=new_id(), **payload.model_dump())
    doc = resource.model_dump()
    doc["created_at"] = now_utc()
    await db.learning_resources.insert_one(dict(doc))
    return resource


@router.put("/learning-resources/{resource_id}", response_model=LearningResource)
async def update_resource(
    resource_id: str, payload: LearningResourceInput, _: dict[str, Any] = Depends(admin_only)
):
    existing = await db.learning_resources.find_one({"id": resource_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found")
    resource = LearningResource(id=resource_id, **payload.model_dump())
    await db.learning_resources.update_one({"id": resource_id}, {"$set": resource.model_dump()})
    return resource


@router.delete("/learning-resources/{resource_id}", response_model=OkResult)
async def delete_resource(resource_id: str, _: dict[str, Any] = Depends(admin_only)):
    res = await db.learning_resources.delete_one({"id": resource_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return OkResult()


# ---------------- certifications ----------------
@router.get("/certifications", response_model=list[Certification])
async def list_certifications(
    user_id: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)
):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    docs = await db.certifications.find({"user_id": target}, {"_id": 0}).to_list(100)
    docs.sort(key=lambda d: d.get("certification_date") or "", reverse=True)
    return [Certification(**d) for d in docs]


@router.post("/certifications", response_model=Certification)
async def create_certification(
    payload: CertificationInput, viewer: dict[str, Any] = Depends(current_user)
):
    cert = Certification(id=new_id(), user_id=viewer["id"], **payload.model_dump())
    await db.certifications.insert_one(cert.model_dump())
    return cert


@router.put("/certifications/{cert_id}", response_model=Certification)
async def update_certification(
    cert_id: str, payload: CertificationInput, viewer: dict[str, Any] = Depends(current_user)
):
    existing = await db.certifications.find_one({"id": cert_id}, {"_id": 0})
    if not existing or existing["user_id"] != viewer["id"]:
        raise HTTPException(status_code=404, detail="Certification not found")
    cert = Certification(id=cert_id, user_id=viewer["id"], **payload.model_dump())
    await db.certifications.update_one({"id": cert_id}, {"$set": cert.model_dump()})
    return cert


@router.delete("/certifications/{cert_id}", response_model=OkResult)
async def delete_certification(cert_id: str, viewer: dict[str, Any] = Depends(current_user)):
    res = await db.certifications.delete_one({"id": cert_id, "user_id": viewer["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certification not found")
    return OkResult()
