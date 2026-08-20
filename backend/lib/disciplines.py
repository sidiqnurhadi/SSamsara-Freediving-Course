"""Freediving discipline metadata shared by dives, PBs, goals and progress."""

DEPTH = ["CWT", "CWTB", "CNF", "FIM", "VWT", "NLT"]
DYNAMIC = ["DYN", "DYNB", "DNF"]
STATIC = ["STA"]

ALL_DISCIPLINES = DEPTH + DYNAMIC + STATIC

# metric: how the performance value is measured — higher is always better.
UNIT = {d: "m" for d in DEPTH + DYNAMIC}
UNIT["STA"] = "s"


def group_of(discipline: str) -> str:
    if discipline in DEPTH:
        return "depth"
    if discipline in DYNAMIC:
        return "dynamic"
    return "static"
