import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_roles
from lib.db import db
from models.schemas import Course, CourseInput, OkResult, new_id, now_utc

router = APIRouter(prefix="/courses", tags=["courses"])
admin_only = require_roles("admin")


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


@router.get("", response_model=list[Course])
async def list_courses(include_inactive: bool = False):
    query: dict[str, Any] = {} if include_inactive else {"status": "active"}
    docs = await db.courses.find(query, {"_id": 0}).to_list(200)
    docs.sort(key=lambda c: c.get("sort_order", 0))
    return [Course(**d) for d in docs]


@router.get("/{slug}", response_model=Course)
async def get_course(slug: str):
    doc = await db.courses.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Course not found")
    return Course(**doc)


@router.post("", response_model=Course)
async def create_course(payload: CourseInput, _: dict[str, Any] = Depends(admin_only)):
    slug = slugify(payload.slug or payload.title)
    if await db.courses.find_one({"slug": slug}):
        raise HTTPException(status_code=409, detail="A course with this slug already exists")
    course = Course(id=new_id(), **{**payload.model_dump(), "slug": slug})
    doc = course.model_dump()
    doc["created_at"] = now_utc()
    await db.courses.insert_one(dict(doc))
    return course


@router.put("/{course_id}", response_model=Course)
async def update_course(
    course_id: str, payload: CourseInput, _: dict[str, Any] = Depends(admin_only)
):
    existing = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Course not found")
    slug = slugify(payload.slug or payload.title)
    updated = Course(id=course_id, **{**payload.model_dump(), "slug": slug})
    await db.courses.update_one(
        {"id": course_id}, {"$set": {**updated.model_dump(), "updated_at": now_utc()}}
    )
    return updated


@router.delete("/{course_id}", response_model=OkResult)
async def delete_course(course_id: str, _: dict[str, Any] = Depends(admin_only)):
    res = await db.courses.delete_one({"id": course_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return OkResult()
