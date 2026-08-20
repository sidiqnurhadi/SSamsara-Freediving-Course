"""Derives a diver's learning level from their VERIFIED certifications.

Certifications are the source of truth: the highest verified certification wins, and a
pending / expired / rejected certification grants nothing. `role` is deliberately not
consulted here — role controls what a user may *do*, level controls what they may *read*.
"""

from typing import Any, Optional

from lib.db import db
from lib.levels import DEFAULT_AGENCY, VERIFIED, level_at, next_level, rank_of

SUPER_ROLES = {"super_admin"}


async def current_level(user_id: str) -> dict[str, Any]:
    """-> {agency, level, rank} from the highest verified certification (rank 0 if none)."""
    certs = await db.certifications.find({"user_id": user_id}, {"_id": 0}).to_list(200)
    best_rank = 0
    best_agency = DEFAULT_AGENCY
    for cert in certs:
        if (cert.get("status") or VERIFIED) != VERIFIED:
            continue
        rank = rank_of(cert.get("agency"), cert.get("certification"))
        if rank and rank > best_rank:
            best_rank = rank
            best_agency = cert.get("agency") or DEFAULT_AGENCY
    return {
        "agency": best_agency,
        "level": level_at(best_agency, best_rank),
        "rank": best_rank,
        "next_level": next_level(best_agency, best_rank),
    }


async def effective_rank(
    user: dict[str, Any], preview_rank: Optional[int] = None
) -> dict[str, Any]:
    """Level context for the request. A super_admin may preview a lower/other rank."""
    info = await current_level(user["id"])
    if user.get("role") in SUPER_ROLES:
        if preview_rank is not None:
            info = {
                **info,
                "rank": preview_rank,
                "level": level_at(info["agency"], preview_rank),
                "next_level": next_level(info["agency"], preview_rank),
                "preview": True,
            }
        else:
            info = {**info, "unrestricted": True}
    return info


async def sync_profile_level(user_id: str) -> dict[str, Any]:
    """Mirror the derived level onto diver_profiles for display (never for authorization)."""
    info = await current_level(user_id)
    await db.diver_profiles.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "current_certification_agency": info["agency"],
                "current_certification_level": info["level"],
                "certification_rank": info["rank"],
                "certification_summary": info["level"] or "Freediver",
            }
        },
        upsert=True,
    )
    return info
