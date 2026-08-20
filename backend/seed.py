"""Idempotent demo seed. Run: cd /app/backend && python seed.py"""

import asyncio

from lib.auth import hash_password
from lib.date_utils import days_ago_str
from lib.db import db
from lib.disciplines import UNIT, group_of
from lib.pb import recalc_discipline_pb
from models.schemas import new_id, now_utc

HERO = "https://images.unsplash.com/photo-1602199926649-2e5e447bab97?crop=entropy&cs=srgb&fm=jpg&q=85&w=1600"

USERS = [
    ("admin@freedive.school", "Maya Admin", "admin", "admin123"),
    ("instructor@freedive.school", "John Doe", "instructor", "instructor123"),
    ("alex@freedive.school", "Alex Diver", "student", "diver123"),
    ("sara@freedive.school", "Sara Blue", "student", "diver123"),
]

COURSES = [
    {
        "title": "Beginner Freediver",
        "slug": "beginner-freediver",
        "level": "Level 1",
        "tagline": "Your first controlled breath-hold descent.",
        "short_description": "Learn breathing, relaxation and safety fundamentals in pool and open water.",
        "description": "A complete introduction to freediving. Over two days you build a calm breathing routine, learn buddy safety and make your first confident depth dives with an instructor at your side.",
        "price": 3500000,
        "duration": "2 Days",
        "max_depth": "12 m",
        "learn_topics": ["Breathing", "Relaxation", "Equalization", "Duck Dive", "Safety", "Static Apnea"],
        "structure": [
            {"label": "Theory", "value": "3 Hours"},
            {"label": "Pool", "value": "2 Sessions"},
            {"label": "Depth", "value": "2 Sessions"},
        ],
        "requirements": ["Minimum age 16", "Able to swim 200 m", "Signed medical declaration"],
        "certification_agency": "AIDA",
        "certification_level": "AIDA 2",
        "certification_requirements": ["STA 2:00", "DYN 40 m", "CWT 12 m"],
        "schedule": "Every weekend",
        "image_url": "https://images.unsplash.com/photo-1627540458907-47a427507e20?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "sort_order": 1,
    },
    {
        "title": "Intermediate Freediver",
        "slug": "intermediate-freediver",
        "level": "Level 2",
        "tagline": "Deeper, calmer, more efficient.",
        "short_description": "Refine technique, learn freefall and extend your comfortable working depth.",
        "description": "Build on your fundamentals with efficient finning, freefall and advanced relaxation. You also learn rescue from 20 m and structured dry training with CO2 and O2 tables.",
        "price": 5500000,
        "duration": "3 Days",
        "max_depth": "24 m",
        "learn_topics": ["Freefall", "Streamlining", "Rescue", "Dynamic Apnea", "Constant Weight", "Equalization"],
        "structure": [
            {"label": "Theory", "value": "4 Hours"},
            {"label": "Pool", "value": "2 Sessions"},
            {"label": "Depth", "value": "4 Sessions"},
        ],
        "requirements": ["AIDA 2 or equivalent", "Minimum age 18", "Signed medical declaration"],
        "certification_agency": "AIDA",
        "certification_level": "AIDA 3",
        "certification_requirements": ["STA 2:45", "DYN 55 m", "CWT 24 m"],
        "schedule": "Monthly",
        "image_url": "https://images.unsplash.com/photo-1628630500614-1c8924c99c3e?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "sort_order": 2,
    },
    {
        "title": "Advanced Freediver",
        "slug": "advanced-freediver",
        "level": "Level 3",
        "tagline": "Mouthfill, deep freefall, full autonomy.",
        "short_description": "Advanced depth work, mouthfill equalization and self-sufficient dive planning.",
        "description": "For experienced divers moving past 30 m. Focus on mouthfill equalization, deep freefall posture, contingency planning and coaching your own training cycles.",
        "price": 8500000,
        "duration": "4 Days",
        "max_depth": "40 m",
        "learn_topics": ["Freefall", "Equalization", "Rescue", "Safety", "Constant Weight", "Relaxation"],
        "structure": [
            {"label": "Theory", "value": "6 Hours"},
            {"label": "Dry", "value": "2 Sessions"},
            {"label": "Depth", "value": "6 Sessions"},
        ],
        "requirements": ["AIDA 3 or equivalent", "CWT 24 m", "Signed medical declaration"],
        "certification_agency": "AIDA",
        "certification_level": "AIDA 4",
        "certification_requirements": ["STA 3:30", "DYN 70 m", "CWT 38 m"],
        "schedule": "By arrangement",
        "image_url": "https://images.pexels.com/photos/32949983/pexels-photo-32949983.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "sort_order": 3,
    },
    {
        "title": "Pool Training",
        "slug": "pool-training",
        "level": "All levels",
        "tagline": "Technique and apnea under supervision.",
        "short_description": "Weekly coached STA, DYN and DNF sessions in a 25 m pool.",
        "description": "Structured pool sessions with a coach on the surface. Work on stroke efficiency, turns, CO2 tolerance and static comfort in a controlled environment.",
        "price": 350000,
        "duration": "2 Hours",
        "max_depth": "5 m pool",
        "learn_topics": ["Static Apnea", "Dynamic Apnea", "Streamlining", "Safety"],
        "structure": [{"label": "Pool", "value": "1 Session"}],
        "requirements": ["Basic freediving course", "Able to swim comfortably"],
        "certification_agency": None,
        "certification_level": None,
        "certification_requirements": [],
        "schedule": "Tuesdays & Thursdays",
        "image_url": "https://images.unsplash.com/photo-1530138948699-6a75eebc9d9b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "sort_order": 4,
    },
    {
        "title": "Depth Training",
        "slug": "depth-training",
        "level": "Certified divers",
        "tagline": "Line time with a safety diver.",
        "short_description": "Open-water depth sessions with buoy, lanyard and dedicated safety.",
        "description": "Book supervised line time for your own depth progression. Includes buoy setup, safety diver, counter-ballast and a post-dive debrief.",
        "price": 750000,
        "duration": "Half Day",
        "max_depth": "Personal limit",
        "learn_topics": ["Freefall", "Equalization", "Safety", "Constant Weight"],
        "structure": [{"label": "Depth", "value": "1 Session"}],
        "requirements": ["AIDA 2 minimum", "Own mask and fins"],
        "certification_agency": None,
        "certification_level": None,
        "certification_requirements": [],
        "schedule": "Weekends",
        "image_url": "https://images.unsplash.com/photo-1502209524164-acea936639a2?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "sort_order": 5,
    },
    {
        "title": "Equalization Training",
        "slug": "equalization-training",
        "level": "All levels",
        "tagline": "Unlock the depth your ears allow.",
        "short_description": "Dry and in-water work on Frenzel, reverse packing and mouthfill.",
        "description": "A focused workshop on the mechanics of equalization. Dry drills, feedback tools and in-water application to remove the most common depth blocker.",
        "price": 1500000,
        "duration": "1 Day",
        "max_depth": "Technique focused",
        "learn_topics": ["Equalization", "Relaxation", "Freefall"],
        "structure": [
            {"label": "Theory", "value": "2 Hours"},
            {"label": "Dry", "value": "2 Sessions"},
        ],
        "requirements": ["Any freediving experience"],
        "certification_agency": None,
        "certification_level": None,
        "certification_requirements": [],
        "schedule": "Monthly",
        "image_url": "https://images.unsplash.com/photo-1620636925598-c6ea8081049c?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
        "sort_order": 6,
    },
    {
        "title": "Coaching Session",
        "slug": "coaching-session",
        "level": "Personal",
        "tagline": "One diver, one coach, one plan.",
        "short_description": "Private coaching with a training plan built around your goals.",
        "description": "A one-to-one session covering technique review, training plan design and periodisation for your next target depth or distance.",
        "price": 1200000,
        "duration": "3 Hours",
        "max_depth": "Personal limit",
        "learn_topics": ["Relaxation", "Streamlining", "Equalization", "Safety"],
        "structure": [{"label": "Coaching", "value": "1 Session"}],
        "requirements": ["None"],
        "certification_agency": None,
        "certification_level": None,
        "certification_requirements": [],
        "schedule": "On request",
        "image_url": "https://images.pexels.com/photos/36709234/pexels-photo-36709234.jpeg?auto=compress&cs=tinysrgb&w=1200",
        "sort_order": 7,
    },
]

RESOURCES = [
    ("AIDA 1", "AIDA International", "Level 1", "Introduction to Freediving — discover-level theory overview.", "AIDA Manuals", "manual", "https://www.aidainternational.org/Education"),
    ("AIDA 2", "AIDA International", "Level 2", "Freediver Course Manual — breathing, safety and first depth dives.", "AIDA Manuals", "manual", "https://www.aidainternational.org/Education"),
    ("AIDA 3", "AIDA International", "Level 3", "Advanced Freediver Manual — freefall, rescue and deeper physiology.", "AIDA Manuals", "manual", "https://www.aidainternational.org/Education"),
    ("AIDA 4", "AIDA International", "Level 4", "Master Freediver Manual — mouthfill, planning and autonomy.", "AIDA Manuals", "manual", "https://www.aidainternational.org/Education"),
    ("Buddy & Rescue Procedures", "Depth School", "All levels", "One-page checklist for buddy rotation, safety diver positioning and rescue.", "Freediving Safety", "pdf", "https://www.aidainternational.org/Education"),
    ("Equalization Fundamentals", "Depth School", "Level 2+", "Frenzel mechanics, reverse packing and mouthfill progression drills.", "Equalization", "link", "https://www.aidainternational.org/Education"),
    ("Dry Training Guide", "Depth School", "All levels", "How to structure CO2 and O2 table cycles safely across a training week.", "Training", "link", "https://www.aidainternational.org/Education"),
    ("School Safety Policy", "Depth School", "All levels", "Our in-water supervision rules and emergency action plan.", "School Materials", "pdf", "https://www.aidainternational.org/Education"),
]


def steps(pairs):
    return [
        {
            "step_order": i,
            "step_type": t,
            "duration_seconds": d,
            "instruction": note,
            "label": None,
        }
        for i, (t, d, note) in enumerate(pairs)
    ]


def co2_template():
    rows = []
    breathe = 120
    for _ in range(8):
        rows.append(("breathe", breathe, "Slow relaxed breathing"))
        rows.append(("hold", 120, "Stay relaxed, expect contractions"))
        breathe = max(breathe - 15, 30)
    return rows


def o2_template():
    rows = [("breathe", 120, "Prepare and relax")]
    hold = 90
    for _ in range(5):
        rows.append(("hold", hold, "Hold — stay still"))
        rows.append(("recovery", 120, "Recovery breathing"))
        hold += 15
    return rows


TEMPLATES = [
    ("CO2 Table — 8 Rounds", "co2", "Shortening breathe-up, constant hold. Builds CO2 tolerance.", co2_template()),
    ("O2 Table — 5 Rounds", "o2", "Constant recovery, lengthening hold. Builds O2 tolerance.", o2_template()),
    (
        "AIDA 3 Style Warm-up",
        "warmup",
        "Progressive dry warm-up before a target attempt. Training template, not a certification procedure.",
        [
            ("relax", 120, "Relax / breathe"),
            ("hold", 60, "Short hold"),
            ("recovery", 120, "Recovery"),
            ("hold", 90, "Medium hold"),
            ("recovery", 150, "Recovery"),
            ("hold", 120, "Long hold"),
            ("recovery", 180, "Recovery"),
            ("main_attempt", 0, "Main attempt — start when ready"),
        ],
    ),
    (
        "STA Warm-up",
        "warmup",
        "Light static preparation.",
        [
            ("stretch", 180, "Diaphragm and rib stretching"),
            ("relax", 180, "Passive relaxation"),
            ("hold", 90, "Easy hold"),
            ("recovery", 180, "Full recovery"),
            ("main_attempt", 0, "Main static attempt"),
        ],
    ),
    (
        "DYNB Warm-up",
        "warmup",
        "Pool dynamic preparation.",
        [
            ("preparation", 120, "Easy laps, no apnea"),
            ("breathe", 120, "Breathe-up"),
            ("hold", 45, "Short dynamic"),
            ("recovery", 150, "Recovery"),
            ("main_attempt", 0, "Main dynamic attempt"),
        ],
    ),
]

DIVES = [
    # (days_ago, discipline, value, location, duration, feeling, notes)
    (170, "CWTB", 12, "Pulau Pramuka", 48, 3, "First depth session after the course."),
    (150, "CWTB", 15, "Pulau Pramuka", 55, 3, None),
    (120, "CWTB", 18, "Nusa Penida", 62, 4, "Freefall starting to feel calm."),
    (95, "FIM", 16, "Pulau Pramuka", 70, 4, None),
    (80, "CWTB", 20, "Nusa Penida", 68, 4, "Equalization comfortable to 20 m."),
    (60, "FIM", 20, "Nusa Penida", 82, 4, "Slow and relaxed pull-down."),
    (40, "CWTB", 22, "Pulau Pramuka", 74, 4, None),
    (12, "CWTB", 24, "Pulau Pramuka", 82, 5, "Best dive so far — no urge to breathe."),
    (30, "CWT", 18, "Nusa Penida", 66, 3, None),
    (160, "STA", 150, "Depth School Pool", 150, 3, None),
    (110, "STA", 175, "Depth School Pool", 175, 3, "Contractions at 1:50."),
    (70, "STA", 190, "Depth School Pool", 190, 4, None),
    (20, "STA", 200, "Depth School Pool", 200, 4, "3:20 — new best."),
    (155, "DYNB", 50, "Depth School Pool", 55, 3, None),
    (100, "DYNB", 62, "Depth School Pool", 68, 4, None),
    (45, "DYNB", 70, "Depth School Pool", 75, 4, None),
    (10, "DYNB", 75, "Depth School Pool", 80, 5, "Smooth turns, no rush."),
    (90, "DNF", 40, "Depth School Pool", 50, 3, None),
    (25, "DNF", 48, "Depth School Pool", 58, 4, None),
]

TRAINING = [
    (2, "co2", "CO2 Table — 8 Rounds", 1740, 8, 8, 120, 6, "Contractions started at round 6."),
    (4, "o2", "O2 Table — 5 Rounds", 1470, 12, 12, 150, 7, "Last hold was demanding."),
    (5, "dry", "", 900, None, None, None, 4, "Stretching and breathing drills."),
    (6, "co2", "CO2 Table — 8 Rounds", 1740, 8, 8, 120, 5, None),
    (9, "static", "", 1200, None, None, 200, 6, "STA 3:20 in pool."),
    (14, "dynamic", "", 2400, None, None, None, 5, "6 x 50 m DYNB."),
    (21, "equalization", "", 600, None, None, None, 3, "Dry mouthfill drills."),
]


async def main() -> None:
    user_ids: dict[str, str] = {}
    for email, name, role, password in USERS:
        existing = await db.users.find_one({"email": email})
        if existing:
            user_ids[role if role != "student" else email] = existing["id"]
            await db.users.update_one(
                {"email": email}, {"$set": {"password_hash": hash_password(password)}}
            )
            continue
        uid = new_id()
        await db.users.insert_one(
            {
                "id": uid,
                "name": name,
                "email": email,
                "password_hash": hash_password(password),
                "role": role,
                "profile_photo": None,
                "created_at": now_utc(),
                "updated_at": now_utc(),
            }
        )
        user_ids[role if role != "student" else email] = uid

    alex = user_ids["alex@freedive.school"]
    sara = user_ids["sara@freedive.school"]
    instructor = user_ids["instructor"]

    await db.diver_profiles.update_one(
        {"user_id": alex},
        {
            "$set": {
                "id": new_id(),
                "user_id": alex,
                "name": "Alex Diver",
                "email": "alex@freedive.school",
                "freediving_since": 2024,
                "certification_summary": "AIDA 2",
                "preferred_discipline": "CWTB",
                "nationality": "Indonesia",
                "home_training_location": "Pulau Pramuka",
                "school": "Depth Freediving School",
                "instructor_name": "John Doe",
                "bio": "Working towards 30 m CWTB. Calm descent, patient freefall.",
                "profile_photo": None,
            }
        },
        upsert=True,
    )
    await db.diver_profiles.update_one(
        {"user_id": sara},
        {
            "$set": {
                "id": new_id(),
                "user_id": sara,
                "name": "Sara Blue",
                "email": "sara@freedive.school",
                "freediving_since": 2023,
                "certification_summary": "AIDA 3",
                "preferred_discipline": "FIM",
                "home_training_location": "Nusa Penida",
            }
        },
        upsert=True,
    )

    for student in (alex, sara):
        await db.instructor_students.update_one(
            {"instructor_id": instructor, "student_id": student},
            {"$set": {"id": new_id(), "instructor_id": instructor, "student_id": student}},
            upsert=True,
        )

    for course in COURSES:
        await db.courses.update_one(
            {"slug": course["slug"]},
            {
                "$set": {
                    **course,
                    "currency": "IDR",
                    "status": "active",
                    "created_at": now_utc(),
                },
                "$setOnInsert": {"id": new_id()},
            },
            upsert=True,
        )

    for title, org, level, desc, category, rtype, url in RESOURCES:
        await db.learning_resources.update_one(
            {"title": title},
            {
                "$set": {
                    "title": title,
                    "organization": org,
                    "level": level,
                    "description": desc,
                    "category": category,
                    "resource_type": rtype,
                    "resource_url": url,
                    "is_active": True,
                },
                "$setOnInsert": {"id": new_id(), "created_at": now_utc()},
            },
            upsert=True,
        )

    for name, category, description, rows in TEMPLATES:
        await db.training_tables.update_one(
            {"name": name, "is_template": True},
            {
                "$set": {
                    "name": name,
                    "category": category,
                    "description": description,
                    "is_template": True,
                    "user_id": None,
                    "steps": steps(rows),
                },
                "$setOnInsert": {"id": new_id(), "created_at": now_utc()},
            },
            upsert=True,
        )

    # dives — replace Alex's demo set so PBs recompute cleanly
    await db.dive_logs.delete_many({"user_id": alex})
    await db.personal_bests.delete_many({"user_id": alex})
    for ago, discipline, value, location, duration, feeling, notes in DIVES:
        await db.dive_logs.insert_one(
            {
                "id": new_id(),
                "user_id": alex,
                "date": days_ago_str(ago),
                "discipline": discipline,
                "value": float(value),
                "unit": UNIT.get(discipline, "m"),
                "group": group_of(discipline),
                "location": location,
                "dive_type": "Open water" if group_of(discipline) == "depth" else "Pool",
                "duration_seconds": duration,
                "max_heart_rate": None,
                "min_heart_rate": None,
                "water_temperature": 28.0 if group_of(discipline) == "depth" else 29.0,
                "weight_used": 2.0,
                "wetsuit_thickness": 3.0,
                "equalization": "Frenzel",
                "buddy": "John Doe",
                "feeling": feeling,
                "notes": notes,
                "is_pb": False,
                "created_at": now_utc(),
            }
        )
    for discipline in {d[1] for d in DIVES}:
        await recalc_discipline_pb(alex, discipline)

    await db.dive_logs.delete_many({"user_id": sara})
    await db.personal_bests.delete_many({"user_id": sara})
    for ago, value in ((30, 26.0), (10, 30.0)):
        await db.dive_logs.insert_one(
            {
                "id": new_id(),
                "user_id": sara,
                "date": days_ago_str(ago),
                "discipline": "FIM",
                "value": value,
                "unit": "m",
                "group": "depth",
                "location": "Nusa Penida",
                "dive_type": "Open water",
                "feeling": 4,
                "is_pb": False,
                "created_at": now_utc(),
            }
        )
    await recalc_discipline_pb(sara, "FIM")

    await db.goals.delete_many({"user_id": alex})
    for discipline, target, ago in (("CWTB", 30.0, -60), ("DYNB", 100.0, -120), ("STA", 240.0, -90)):
        await db.goals.insert_one(
            {
                "id": new_id(),
                "user_id": alex,
                "discipline": discipline,
                "target_value": target,
                "target_date": days_ago_str(ago),
                "status": "active",
                "created_at": now_utc(),
            }
        )
    await db.goals.delete_many({"user_id": sara})
    await db.goals.insert_one(
        {
            "id": new_id(),
            "user_id": sara,
            "discipline": "FIM",
            "target_value": 35.0,
            "target_date": days_ago_str(-90),
            "status": "active",
            "created_at": now_utc(),
        }
    )

    await db.training_entries.delete_many({"user_id": alex})
    for ago, ttype, table, duration, done, total, hold, difficulty, notes in TRAINING:
        await db.training_entries.insert_one(
            {
                "id": new_id(),
                "user_id": alex,
                "source": "session" if table else "manual",
                "date": days_ago_str(ago),
                "training_type": ttype,
                "table_name": table,
                "duration_seconds": duration,
                "completed_steps": done,
                "total_steps": total,
                "longest_hold_seconds": hold,
                "result": None,
                "difficulty": difficulty,
                "notes": notes,
                "created_at": now_utc(),
            }
        )

    await db.certifications.delete_many({"user_id": alex})
    await db.certifications.insert_one(
        {
            "id": new_id(),
            "user_id": alex,
            "agency": "AIDA",
            "certification": "AIDA 2",
            "instructor": "John Doe",
            "certification_date": days_ago_str(200),
            "expiration_date": None,
            "certificate_number": "AIDA-2-90231",
            "certificate_file_url": None,
        }
    )

    print("seed complete")
    print("hero image:", HERO)


if __name__ == "__main__":
    asyncio.run(main())
