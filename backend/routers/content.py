from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse

from lib.access import current_level, effective_rank, sync_profile_level
from lib.auth import assert_can_view, current_user, require_roles
from lib.certs import shape_cert
from lib.db import db
from lib.levels import AGENCIES, VERIFIED, can_access, level_at, rank_of, resolve_agency
from lib.storage import path_for
from models.schemas import (
    Certification,
    CertificationInput,
    DiverProfile,
    DiverProfileUpdate,
    LearningResource,
    LearningResourceInput,
    LearningSummary,
    OkResult,
    ResourceUrl,
    new_id,
    now_utc,
)

router = APIRouter(tags=["content"])
admin_only = require_roles("admin", "super_admin")


# ---------------- diver profile ----------------
@router.get("/profile", response_model=DiverProfile)
async def get_profile(user_id: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    await sync_profile_level(target)
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
    doc.setdefault("user_id", target)
    return DiverProfile(**doc)


@router.put("/profile", response_model=DiverProfile)
async def update_profile(payload: DiverProfileUpdate, viewer: dict[str, Any] = Depends(current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    # certification_summary is derived from verified certifications, never typed in
    updates.pop("certification_summary", None)
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
    await sync_profile_level(viewer["id"])
    doc = await db.diver_profiles.find_one({"user_id": viewer["id"]}, {"_id": 0})
    assert doc is not None
    return DiverProfile(**doc)


# ---------------- learning resources ----------------
def _resource_rank(doc: dict[str, Any]) -> int:
    if doc.get("minimum_level_rank"):
        return int(doc["minimum_level_rank"])
    return rank_of(doc.get("access_agency"), doc.get("minimum_access_level")) or 0


def _shape(doc: dict[str, Any], user_rank: int, unrestricted: bool) -> LearningResource:
    minimum = _resource_rank(doc)
    access_type = doc.get("resource_access_type", "certification_level")
    gated = access_type == "certification_level"
    locked = bool(gated and not unrestricted and not can_access(user_rank, minimum))
    agency = resolve_agency(doc.get("access_agency"))
    return LearningResource(
        id=doc["id"],
        title=doc["title"],
        organization=doc.get("organization"),
        level=doc.get("level"),
        description=doc.get("description"),
        category=doc.get("category", "School Materials"),
        resource_type=doc.get("resource_type", "link"),
        # never leak a locked URL
        resource_url="" if locked else doc.get("resource_url", ""),
        is_active=bool(doc.get("is_active", True)),
        access_agency=agency,
        minimum_access_level=doc.get("minimum_access_level"),
        minimum_level_rank=minimum,
        resource_access_type=access_type,
        locked=locked,
        required_level=doc.get("minimum_access_level") or level_at(agency, minimum),
    )


async def _resource_docs(viewer: dict[str, Any], include_inactive: bool) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if not (include_inactive and viewer["role"] in {"admin", "super_admin"}):
        query["is_active"] = True
    docs = await db.learning_resources.find(query, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: (_resource_rank(d), d.get("category", ""), d.get("title", "")))
    return docs


@router.get("/learning-resources", response_model=list[LearningResource])
async def list_resources(
    include_inactive: bool = False,
    preview_rank: Optional[int] = Query(default=None, ge=0, le=9),
    viewer: dict[str, Any] = Depends(current_user),
):
    info = await effective_rank(viewer, preview_rank)
    docs = await _resource_docs(viewer, include_inactive)
    return [_shape(doc, info["rank"], bool(info.get("unrestricted"))) for doc in docs]


@router.get("/learning-resources/summary", response_model=LearningSummary)
async def learning_summary(
    preview_rank: Optional[int] = Query(default=None, ge=0, le=9),
    viewer: dict[str, Any] = Depends(current_user),
):
    info = await effective_rank(viewer, preview_rank)
    docs = await _resource_docs(viewer, include_inactive=False)
    shaped = [_shape(doc, info["rank"], bool(info.get("unrestricted"))) for doc in docs]
    agency = resolve_agency(info["agency"])
    accessible = [
        label
        for label, rank in AGENCIES[agency]
        if info.get("unrestricted") or rank <= info["rank"]
    ]
    return LearningSummary(
        agency=agency,
        level=info["level"],
        rank=info["rank"],
        next_level=info["next_level"],
        available_count=sum(1 for item in shaped if not item.locked),
        locked_count=sum(1 for item in shaped if item.locked),
        total_count=len(shaped),
        accessible_levels=accessible,
        unrestricted=bool(info.get("unrestricted")),
        preview=bool(info.get("preview")),
    )


@router.get("/learning-resources/{resource_id}/open", response_model=ResourceUrl)
async def open_resource(
    resource_id: str,
    preview_rank: Optional[int] = Query(default=None, ge=0, le=9),
    viewer: dict[str, Any] = Depends(current_user),
):
    """Server-side gate. The URL of a locked resource is never returned."""
    doc = await db.learning_resources.find_one({"id": resource_id}, {"_id": 0})
    if not doc or not doc.get("is_active", True):
        raise HTTPException(status_code=404, detail="Resource not found")
    info = await effective_rank(viewer, preview_rank)
    shaped = _shape(doc, info["rank"], bool(info.get("unrestricted")))
    if shaped.locked:
        raise HTTPException(
            status_code=403,
            detail=f"This resource requires {shaped.required_level} certification.",
        )
    return ResourceUrl(
        resource_url=doc["resource_url"],
        resource_type=doc.get("resource_type", "link"),
        title=doc["title"],
    )


def _resource_doc(payload: LearningResourceInput) -> dict[str, Any]:
    data = payload.model_dump()
    agency = resolve_agency(data.get("access_agency"))
    data["access_agency"] = agency
    data["minimum_level_rank"] = rank_of(agency, data.get("minimum_access_level")) or 0
    return data


@router.post("/learning-resources", response_model=LearningResource)
async def create_resource(
    payload: LearningResourceInput, viewer: dict[str, Any] = Depends(admin_only)
):
    doc = {"id": new_id(), **_resource_doc(payload), "created_at": now_utc()}
    await db.learning_resources.insert_one(dict(doc))
    return _shape(doc, 0, True)


@router.put("/learning-resources/{resource_id}", response_model=LearningResource)
async def update_resource(
    resource_id: str,
    payload: LearningResourceInput,
    viewer: dict[str, Any] = Depends(admin_only),
):
    existing = await db.learning_resources.find_one({"id": resource_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Resource not found")
    doc = {**existing, **_resource_doc(payload), "id": resource_id, "updated_at": now_utc()}
    await db.learning_resources.update_one({"id": resource_id}, {"$set": doc})
    return _shape(doc, 0, True)


@router.delete("/learning-resources/{resource_id}", response_model=OkResult)
async def delete_resource(resource_id: str, viewer: dict[str, Any] = Depends(admin_only)):
    res = await db.learning_resources.delete_one({"id": resource_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return OkResult()


# ---------------- certifications ----------------
def _cert(doc: dict[str, Any]) -> Certification:
    return shape_cert(doc)


@router.get("/certifications/{cert_id}/file")
async def download_certificate(cert_id: str, viewer: dict[str, Any] = Depends(current_user)):
    """Authenticated certificate download. No public/predictable URL exists for these files."""
    doc = await db.certifications.find_one({"id": cert_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Certification not found")
    # self, admin/super_admin, or an instructor this diver is assigned to
    await assert_can_view(viewer, doc["user_id"])
    key = doc.get("certificate_file_key")
    path = path_for(key) if key else None
    if not path:
        raise HTTPException(status_code=404, detail="No certificate PDF has been uploaded")
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=doc.get("certificate_file_name") or "certificate.pdf",
        content_disposition_type="inline",
    )


@router.get("/certifications", response_model=list[Certification])
async def list_certifications(
    user_id: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)
):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    docs = await db.certifications.find({"user_id": target}, {"_id": 0}).to_list(100)
    docs.sort(key=lambda d: d.get("certification_date") or "", reverse=True)
    return [_cert(doc) for doc in docs]


@router.get("/certifications/level", response_model=LearningSummary)
async def my_level(user_id: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    info = await current_level(target)
    agency = resolve_agency(info["agency"])
    return LearningSummary(
        agency=agency,
        level=info["level"],
        rank=info["rank"],
        next_level=info["next_level"],
        accessible_levels=[label for label, rank in AGENCIES[agency] if rank <= info["rank"]],
    )


@router.post("/certifications", response_model=Certification)
async def create_certification(
    payload: CertificationInput, viewer: dict[str, Any] = Depends(current_user)
):
    # Self-added certifications start as pending — only an admin can verify them, so a
    # diver cannot unlock higher-level content by typing a level into their profile.
    doc = {
        "id": new_id(),
        "user_id": viewer["id"],
        "user_name": viewer["name"],
        **payload.model_dump(),
        "status": "pending",
        "created_at": now_utc(),
    }
    await db.certifications.insert_one(dict(doc))
    await sync_profile_level(viewer["id"])
    return _cert(doc)


@router.put("/certifications/{cert_id}", response_model=Certification)
async def update_certification(
    cert_id: str, payload: CertificationInput, viewer: dict[str, Any] = Depends(current_user)
):
    existing = await db.certifications.find_one({"id": cert_id}, {"_id": 0})
    if not existing or existing["user_id"] != viewer["id"]:
        raise HTTPException(status_code=404, detail="Certification not found")
    doc = {
        **existing,
        **payload.model_dump(),
        # editing a certification sends it back for verification
        "status": "pending",
    }
    await db.certifications.update_one({"id": cert_id}, {"$set": doc})
    await sync_profile_level(viewer["id"])
    return _cert(doc)


@router.delete("/certifications/{cert_id}", response_model=OkResult)
async def delete_certification(cert_id: str, viewer: dict[str, Any] = Depends(current_user)):
    res = await db.certifications.delete_one({"id": cert_id, "user_id": viewer["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certification not found")
    await sync_profile_level(viewer["id"])
    return OkResult()
