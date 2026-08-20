from typing import Any

from fastapi import APIRouter, Depends

from lib.auth import current_user
from lib.date_utils import week_start_str
from lib.db import db
from lib.disciplines import DEPTH, DYNAMIC, UNIT
from models.schemas import (
    DashboardData,
    DashboardStat,
    DiveLog,
    DiverProfile,
    SeriesPoint,
    UserPublic,
    WeeklyTraining,
)
from routers.dives import _goal_view

router = APIRouter(tags=["dashboard"])


def _fmt(value: float, unit: str) -> str:
    if unit == "s":
        total = int(value)
        return f"{total // 60:02d}:{total % 60:02d}"
    return f"{value:g} m"


@router.get("/dashboard", response_model=DashboardData)
async def dashboard(viewer: dict[str, Any] = Depends(current_user)):
    user_id = viewer["id"]
    pbs = await db.personal_bests.find({"user_id": user_id}, {"_id": 0}).to_list(100)
    by_discipline = {p["discipline"]: p for p in pbs}

    def best_of(group: list[str]) -> dict[str, Any] | None:
        candidates = [p for p in pbs if p["discipline"] in group]
        return max(candidates, key=lambda p: p["value"]) if candidates else None

    depth_pb = best_of(DEPTH)
    dyn_pb = best_of(DYNAMIC)
    sta_pb = by_discipline.get("STA")

    stats: list[DashboardStat] = []
    for label, pb, unit in (
        ("Max Depth", depth_pb, "m"),
        ("Dynamic", dyn_pb, "m"),
        ("Static", sta_pb, "s"),
    ):
        stats.append(
            DashboardStat(
                label=label,
                discipline=pb["discipline"] if pb else None,
                value=pb["value"] if pb else None,
                unit=unit,
                display=_fmt(pb["value"], unit) if pb else "—",
            )
        )

    dives = await db.dive_logs.find({"user_id": user_id}, {"_id": 0}).to_list(2000)
    dives.sort(key=lambda d: d["date"], reverse=True)
    entries = await db.training_entries.find({"user_id": user_id}, {"_id": 0}).to_list(2000)

    stats.append(
        DashboardStat(label="Total Dives", value=len(dives), unit="", display=str(len(dives)))
    )
    stats.append(
        DashboardStat(
            label="Training Sessions", value=len(entries), unit="", display=str(len(entries))
        )
    )

    depth_discipline = depth_pb["discipline"] if depth_pb else None
    depth_series = [
        SeriesPoint(date=d["date"], value=d["value"], is_pb=bool(d.get("is_pb")))
        for d in sorted(
            (d for d in dives if d["discipline"] == depth_discipline), key=lambda d: d["date"]
        )
    ]

    week_start = week_start_str()
    week_entries = [e for e in entries if e["date"] >= week_start]
    buckets: dict[str, WeeklyTraining] = {}
    for entry in week_entries:
        key = entry["training_type"]
        bucket = buckets.setdefault(key, WeeklyTraining(label=key, sessions=0, total_seconds=0))
        bucket.sessions += 1
        bucket.total_seconds += entry.get("duration_seconds") or 0

    goal_docs = await db.goals.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    goals = [await _goal_view(g) for g in goal_docs]

    profile_doc = await db.diver_profiles.find_one({"user_id": user_id}, {"_id": 0})
    profile = (
        DiverProfile(**profile_doc)
        if profile_doc
        else DiverProfile(user_id=user_id, name=viewer["name"], email=viewer["email"])
    )

    _ = UNIT  # discipline units are attached per-stat above
    return DashboardData(
        user=UserPublic(
            id=viewer["id"],
            name=viewer["name"],
            email=viewer["email"],
            role=viewer["role"],
            profile_photo=viewer.get("profile_photo"),
        ),
        profile=profile,
        stats=stats,
        total_dives=len(dives),
        total_training_sessions=len(entries),
        recent_dives=[DiveLog(**d) for d in dives[:5]],
        goals=goals,
        depth_series=depth_series,
        depth_discipline=depth_discipline,
        week_training=list(buckets.values()),
        week_total_seconds=sum(b.total_seconds for b in buckets.values()),
    )
