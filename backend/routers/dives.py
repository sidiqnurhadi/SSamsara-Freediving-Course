from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from lib.auth import assert_can_view, current_user
from lib.db import db
from lib.disciplines import ALL_DISCIPLINES, DEPTH, DYNAMIC, UNIT, group_of
from lib.pb import recalc_discipline_pb
from models.schemas import (
    DiveLog,
    DiveLogInput,
    DiveSaveResult,
    DisciplineProgress,
    Goal,
    GoalInput,
    OkResult,
    PersonalBest,
    SeriesPoint,
    new_id,
    now_utc,
)

router = APIRouter(tags=["diving"])


async def _dive_doc(user_id: str, payload: DiveLogInput) -> DiveLog:
    data = payload.model_dump()
    discipline = data["discipline"]
    return DiveLog(
        id=new_id(),
        user_id=user_id,
        unit=UNIT.get(discipline, "m"),
        group=group_of(discipline),
        **data,
    )


# ---------------- dives ----------------
@router.get("/dives", response_model=list[DiveLog])
async def list_dives(
    user_id: Optional[str] = None,
    group: Optional[str] = None,
    discipline: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=500, le=1000),
    viewer: dict[str, Any] = Depends(current_user),
):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    query: dict[str, Any] = {"user_id": target}
    if group and group != "all":
        query["group"] = group
    if discipline and discipline != "all":
        query["discipline"] = discipline
    if search:
        query["$or"] = [
            {"location": {"$regex": search, "$options": "i"}},
            {"notes": {"$regex": search, "$options": "i"}},
            {"buddy": {"$regex": search, "$options": "i"}},
        ]
    docs = await db.dive_logs.find(query, {"_id": 0}).to_list(limit)
    docs.sort(key=lambda d: d["date"], reverse=True)
    return [DiveLog(**d) for d in docs]


@router.get("/dives/{dive_id}", response_model=DiveLog)
async def get_dive(dive_id: str, viewer: dict[str, Any] = Depends(current_user)):
    doc = await db.dive_logs.find_one({"id": dive_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Dive not found")
    await assert_can_view(viewer, doc["user_id"])
    return DiveLog(**doc)


@router.post("/dives", response_model=DiveSaveResult)
async def create_dive(payload: DiveLogInput, viewer: dict[str, Any] = Depends(current_user)):
    dive = await _dive_doc(viewer["id"], payload)
    previous_pb = await db.personal_bests.find_one(
        {"user_id": viewer["id"], "discipline": dive.discipline}, {"_id": 0}
    )
    await db.dive_logs.insert_one(dive.model_dump())
    pb = await recalc_discipline_pb(viewer["id"], dive.discipline)
    await _refresh_goals(viewer["id"])
    fresh = await db.dive_logs.find_one({"id": dive.id}, {"_id": 0})
    is_new_pb = bool(
        pb
        and pb.dive_log_id == dive.id
        and (previous_pb is None or dive.value > previous_pb["value"])
    )
    return DiveSaveResult(dive=DiveLog(**(fresh or dive.model_dump())), new_pb=pb if is_new_pb else None)


@router.put("/dives/{dive_id}", response_model=DiveSaveResult)
async def update_dive(
    dive_id: str, payload: DiveLogInput, viewer: dict[str, Any] = Depends(current_user)
):
    existing = await db.dive_logs.find_one({"id": dive_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Dive not found")
    if existing["user_id"] != viewer["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = payload.model_dump()
    discipline = data["discipline"]
    await db.dive_logs.update_one(
        {"id": dive_id},
        {
            "$set": {
                **data,
                "unit": UNIT.get(discipline, "m"),
                "group": group_of(discipline),
                "updated_at": now_utc(),
            }
        },
    )
    await recalc_discipline_pb(viewer["id"], existing["discipline"])
    pb = await recalc_discipline_pb(viewer["id"], discipline)
    await _refresh_goals(viewer["id"])
    fresh = await db.dive_logs.find_one({"id": dive_id}, {"_id": 0})
    assert fresh is not None
    return DiveSaveResult(
        dive=DiveLog(**fresh),
        new_pb=pb if pb and pb.dive_log_id == dive_id else None,
    )


@router.delete("/dives/{dive_id}", response_model=OkResult)
async def delete_dive(dive_id: str, viewer: dict[str, Any] = Depends(current_user)):
    existing = await db.dive_logs.find_one({"id": dive_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Dive not found")
    if existing["user_id"] != viewer["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.dive_logs.delete_one({"id": dive_id})
    await recalc_discipline_pb(viewer["id"], existing["discipline"])
    await _refresh_goals(viewer["id"])
    return OkResult()


# ---------------- personal bests ----------------
@router.get("/personal-bests", response_model=list[PersonalBest])
async def list_pbs(user_id: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    docs = await db.personal_bests.find({"user_id": target}, {"_id": 0}).to_list(100)
    order = {d: i for i, d in enumerate(ALL_DISCIPLINES)}
    docs.sort(key=lambda d: order.get(d["discipline"], 99))
    return [PersonalBest(**d) for d in docs]


# ---------------- goals ----------------
async def _goal_view(goal: dict[str, Any]) -> Goal:
    pb = await db.personal_bests.find_one(
        {"user_id": goal["user_id"], "discipline": goal["discipline"]}, {"_id": 0}
    )
    current = float(pb["value"]) if pb else 0.0
    target = float(goal["target_value"])
    percent = round(min(current / target * 100, 100), 1) if target else 0.0
    status = goal.get("status", "active")
    if status == "active" and current >= target:
        status = "achieved"
    return Goal(
        id=goal["id"],
        user_id=goal["user_id"],
        discipline=goal["discipline"],
        unit=UNIT.get(goal["discipline"], "m"),
        target_value=target,
        target_date=goal.get("target_date"),
        status=status,
        current_value=current,
        progress_percent=percent,
        remaining=round(max(target - current, 0), 1),
    )


async def _refresh_goals(user_id: str) -> None:
    goals = await db.goals.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    for goal in goals:
        view = await _goal_view(goal)
        if view.status != goal.get("status"):
            await db.goals.update_one({"id": goal["id"]}, {"$set": {"status": view.status}})


@router.get("/goals", response_model=list[Goal])
async def list_goals(user_id: Optional[str] = None, viewer: dict[str, Any] = Depends(current_user)):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    docs = await db.goals.find({"user_id": target}, {"_id": 0}).to_list(200)
    return [await _goal_view(d) for d in docs]


@router.post("/goals", response_model=Goal)
async def create_goal(payload: GoalInput, viewer: dict[str, Any] = Depends(current_user)):
    if payload.discipline not in ALL_DISCIPLINES:
        raise HTTPException(status_code=422, detail="Unknown discipline")
    doc = {
        "id": new_id(),
        "user_id": viewer["id"],
        **payload.model_dump(),
        "created_at": now_utc(),
    }
    await db.goals.insert_one(dict(doc))
    return await _goal_view(doc)


@router.put("/goals/{goal_id}", response_model=Goal)
async def update_goal(
    goal_id: str, payload: GoalInput, viewer: dict[str, Any] = Depends(current_user)
):
    existing = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    if not existing or existing["user_id"] != viewer["id"]:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.goals.update_one({"id": goal_id}, {"$set": payload.model_dump()})
    fresh = await db.goals.find_one({"id": goal_id}, {"_id": 0})
    assert fresh is not None
    return await _goal_view(fresh)


@router.delete("/goals/{goal_id}", response_model=OkResult)
async def delete_goal(goal_id: str, viewer: dict[str, Any] = Depends(current_user)):
    res = await db.goals.delete_one({"id": goal_id, "user_id": viewer["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    return OkResult()


# ---------------- progress ----------------
@router.get("/progress", response_model=list[DisciplineProgress])
async def progress(
    group: str = "depth",
    user_id: Optional[str] = None,
    viewer: dict[str, Any] = Depends(current_user),
):
    target = user_id or viewer["id"]
    await assert_can_view(viewer, target)
    if group == "depth":
        disciplines = DEPTH
    elif group == "dynamic":
        disciplines = DYNAMIC
    else:
        disciplines = ["STA"]

    out: list[DisciplineProgress] = []
    for discipline in disciplines:
        dives = await db.dive_logs.find(
            {"user_id": target, "discipline": discipline}, {"_id": 0}
        ).to_list(1000)
        if not dives:
            continue
        dives.sort(key=lambda d: d["date"])
        pb = await db.personal_bests.find_one(
            {"user_id": target, "discipline": discipline}, {"_id": 0}
        )
        out.append(
            DisciplineProgress(
                discipline=discipline,
                unit=UNIT.get(discipline, "m"),
                current_pb=pb["value"] if pb else None,
                previous_pb=pb.get("previous_value") if pb else None,
                improvement_percent=pb.get("improvement_percent") if pb else None,
                total_sessions=len(dives),
                last_session_date=dives[-1]["date"],
                series=[
                    SeriesPoint(date=d["date"], value=d["value"], is_pb=bool(d.get("is_pb")))
                    for d in dives
                ],
            )
        )
    return out
