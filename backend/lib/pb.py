"""Personal-best derivation. PBs are always recomputed from the dive_logs collection,
so editing or deleting a PB dive can never leave a stale PB behind."""

from typing import Any, Optional

from lib.db import db
from lib.disciplines import UNIT, group_of
from models.schemas import PersonalBest, new_id


def _sorted_by_perf(dives: list[dict[str, Any]]) -> list[dict[str, Any]]:
    # chronological, so "previous PB" means the best before the current best was set
    return sorted(dives, key=lambda d: (d["date"], d.get("created_at") or ""))


async def recalc_discipline_pb(user_id: str, discipline: str) -> Optional[PersonalBest]:
    dives = await db.dive_logs.find(
        {"user_id": user_id, "discipline": discipline}, {"_id": 0}
    ).to_list(2000)
    await db.dive_logs.update_many(
        {"user_id": user_id, "discipline": discipline}, {"$set": {"is_pb": False}}
    )
    await db.personal_bests.delete_many({"user_id": user_id, "discipline": discipline})
    if not dives:
        return None

    best: Optional[dict[str, Any]] = None
    previous: Optional[float] = None
    pb_dive_ids: list[str] = []
    for dive in _sorted_by_perf(dives):
        if best is None or dive["value"] > best["value"]:
            previous = best["value"] if best else None
            best = dive
            pb_dive_ids.append(dive["id"])

    assert best is not None
    improvement = None
    if previous:
        improvement = round((best["value"] - previous) / previous * 100, 1)

    pb = PersonalBest(
        id=new_id(),
        user_id=user_id,
        discipline=discipline,
        group=group_of(discipline),
        unit=UNIT.get(discipline, "m"),
        value=best["value"],
        date=best["date"],
        dive_log_id=best["id"],
        previous_value=previous,
        improvement_percent=improvement,
    )
    await db.personal_bests.insert_one(pb.model_dump())
    await db.dive_logs.update_many(
        {"user_id": user_id, "id": {"$in": pb_dive_ids}}, {"$set": {"is_pb": True}}
    )
    return pb


async def get_pb(user_id: str, discipline: str) -> Optional[dict[str, Any]]:
    return await db.personal_bests.find_one(
        {"user_id": user_id, "discipline": discipline}, {"_id": 0}
    )
