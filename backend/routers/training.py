from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import assert_can_view, current_user
from lib.date_utils import today_str
from lib.db import db
from models.schemas import (
    OkResult,
    TableStep,
    TrainingEntry,
    TrainingLogInput,
    TrainingSessionInput,
    TrainingTable,
    TrainingTableInput,
    new_id,
    now_utc,
)

router = APIRouter(prefix="/training", tags=["training"])


def _normalise(steps: list[TableStep]) -> list[TableStep]:
    return [
        TableStep(
            step_order=i,
            step_type=s.step_type,
            duration_seconds=s.duration_seconds,
            instruction=s.instruction,
            label=s.label,
        )
        for i, s in enumerate(sorted(steps, key=lambda s: s.step_order))
    ]


def _to_table(doc: dict[str, Any]) -> TrainingTable:
    steps = _normalise([TableStep(**s) for s in doc.get("steps", [])])
    return TrainingTable(
        id=doc["id"],
        user_id=doc.get("user_id"),
        name=doc["name"],
        category=doc["category"],
        description=doc.get("description"),
        is_template=bool(doc.get("is_template")),
        steps=steps,
        total_seconds=sum(s.duration_seconds for s in steps),
    )


# ---------------- tables ----------------
@router.get("/tables", response_model=list[TrainingTable])
async def list_tables(category: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)):
    query: dict[str, Any] = {
        "$or": [{"user_id": viewer["id"]}, {"is_template": True}],
    }
    if category and category != "all":
        query["category"] = category
    docs = await db.training_tables.find(query, {"_id": 0}).to_list(500)
    docs.sort(key=lambda d: (not d.get("is_template"), d["name"]))
    return [_to_table(d) for d in docs]


@router.get("/tables/{table_id}", response_model=TrainingTable)
async def get_table(table_id: str, viewer: dict[str, Any] = Depends(current_user)):
    doc = await db.training_tables.find_one({"id": table_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Table not found")
    if not doc.get("is_template") and doc.get("user_id") != viewer["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    return _to_table(doc)


@router.post("/tables", response_model=TrainingTable)
async def create_table(payload: TrainingTableInput, viewer: dict[str, Any] = Depends(current_user)):
    if not payload.steps:
        raise HTTPException(status_code=422, detail="A table needs at least one step")
    doc = {
        "id": new_id(),
        "user_id": viewer["id"],
        "name": payload.name.strip(),
        "category": payload.category,
        "description": payload.description,
        "is_template": False,
        "steps": [s.model_dump() for s in _normalise(payload.steps)],
        "created_at": now_utc(),
    }
    await db.training_tables.insert_one(dict(doc))
    return _to_table(doc)


@router.put("/tables/{table_id}", response_model=TrainingTable)
async def update_table(
    table_id: str, payload: TrainingTableInput, viewer: dict[str, Any] = Depends(current_user)
):
    existing = await db.training_tables.find_one({"id": table_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Table not found")
    if existing.get("user_id") != viewer["id"]:
        raise HTTPException(status_code=403, detail="Templates cannot be edited — duplicate first")
    updated = {
        **existing,
        "name": payload.name.strip(),
        "category": payload.category,
        "description": payload.description,
        "steps": [s.model_dump() for s in _normalise(payload.steps)],
    }
    await db.training_tables.update_one({"id": table_id}, {"$set": updated})
    return _to_table(updated)


@router.post("/tables/{table_id}/duplicate", response_model=TrainingTable)
async def duplicate_table(table_id: str, viewer: dict[str, Any] = Depends(current_user)):
    source = await db.training_tables.find_one({"id": table_id}, {"_id": 0})
    if not source:
        raise HTTPException(status_code=404, detail="Table not found")
    if not source.get("is_template") and source.get("user_id") != viewer["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    doc = {
        **source,
        "id": new_id(),
        "user_id": viewer["id"],
        "is_template": False,
        "name": f"{source['name']} (copy)",
        "created_at": now_utc(),
    }
    await db.training_tables.insert_one(dict(doc))
    return _to_table(doc)


@router.delete("/tables/{table_id}", response_model=OkResult)
async def delete_table(table_id: str, viewer: dict[str, Any] = Depends(current_user)):
    res = await db.training_tables.delete_one({"id": table_id, "user_id": viewer["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found or not editable")
    return OkResult()


# ---------------- history (timer sessions + manual logs) ----------------
@router.get("/history", response_model=list[TrainingEntry])
async def history(
    training_type: Optional[str] = None,
    user_id: Optional[str] = None,
    viewer: dict[str, Any] = Depends(current_user),
):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    query: dict[str, Any] = {"user_id": target}
    if training_type and training_type != "all":
        query["training_type"] = training_type
    docs = await db.training_entries.find(query, {"_id": 0}).to_list(1000)
    docs.sort(key=lambda d: d["date"], reverse=True)
    return [TrainingEntry(**d) for d in docs]


@router.post("/sessions", response_model=TrainingEntry)
async def complete_session(
    payload: TrainingSessionInput, viewer: dict[str, Any] = Depends(current_user)
):
    entry = TrainingEntry(
        id=new_id(),
        user_id=viewer["id"],
        source="session",
        date=today_str(),
        training_type=payload.training_type,
        table_name=payload.table_name,
        duration_seconds=payload.total_duration,
        completed_steps=payload.completed_steps,
        total_steps=payload.total_steps,
        longest_hold_seconds=payload.longest_hold_seconds,
        difficulty=payload.difficulty,
        notes=payload.notes,
    )
    doc = entry.model_dump()
    doc["table_id"] = payload.table_id
    await db.training_entries.insert_one(dict(doc))
    return entry


@router.post("/logs", response_model=TrainingEntry)
async def create_manual_log(
    payload: TrainingLogInput, viewer: dict[str, Any] = Depends(current_user)
):
    entry = TrainingEntry(
        id=new_id(),
        user_id=viewer["id"],
        source="manual",
        date=payload.date,
        training_type=payload.training_type,
        duration_seconds=payload.duration_seconds,
        result=payload.result,
        difficulty=payload.difficulty,
        notes=payload.notes,
    )
    await db.training_entries.insert_one(entry.model_dump())
    return entry


@router.delete("/history/{entry_id}", response_model=OkResult)
async def delete_entry(entry_id: str, viewer: dict[str, Any] = Depends(current_user)):
    res = await db.training_entries.delete_one({"id": entry_id, "user_id": viewer["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entry not found")
    return OkResult()
