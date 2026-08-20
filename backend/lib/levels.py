"""Generic certification-agency / level registry.

Authorization never compares level *strings* — it compares integer ranks, so a new
agency (Molchanovs Waves, SSI Levels, …) only needs a row here.
"""

from typing import Optional

# agency -> ordered [(level label, rank)]
AGENCIES: dict[str, list[tuple[str, int]]] = {
    "AIDA": [("AIDA 1", 1), ("AIDA 2", 2), ("AIDA 3", 3), ("AIDA 4", 4)],
    "Molchanovs": [("Wave 1", 1), ("Wave 2", 2), ("Wave 3", 3), ("Wave 4", 4)],
    "SSI": [("Level 1", 1), ("Level 2", 2), ("Level 3", 3), ("Level 4", 4)],
}

DEFAULT_AGENCY = "AIDA"
VERIFIED = "verified"
CERT_STATUSES = ["pending", "verified", "expired", "rejected"]


def _norm(value: Optional[str]) -> str:
    return " ".join((value or "").strip().lower().split())


def resolve_agency(agency: Optional[str]) -> str:
    target = _norm(agency)
    for name in AGENCIES:
        if _norm(name) == target:
            return name
    return DEFAULT_AGENCY


def rank_of(agency: Optional[str], level: Optional[str]) -> Optional[int]:
    """Rank for a level label. Tolerates 'aida 3', 'AIDA3', or a bare '3'."""
    if level is None:
        return None
    resolved = resolve_agency(agency)
    target = _norm(level).replace(" ", "")
    for label, rank in AGENCIES[resolved]:
        if _norm(label).replace(" ", "") == target:
            return rank
    digits = "".join(ch for ch in target if ch.isdigit())
    if digits:
        rank = int(digits)
        if any(rank == r for _, r in AGENCIES[resolved]):
            return rank
    return None


def level_at(agency: Optional[str], rank: Optional[int]) -> Optional[str]:
    if rank is None:
        return None
    for label, value in AGENCIES[resolve_agency(agency)]:
        if value == rank:
            return label
    return None


def next_level(agency: Optional[str], rank: Optional[int]) -> Optional[str]:
    return level_at(agency, (rank or 0) + 1)


def max_rank(agency: Optional[str]) -> int:
    return max(r for _, r in AGENCIES[resolve_agency(agency)])


def can_access(user_rank: Optional[int], minimum_rank: Optional[int]) -> bool:
    """The single access rule: a diver reaches their own level and everything below it."""
    if not minimum_rank:
        return True
    return (user_rank or 0) >= minimum_rank
