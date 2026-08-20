# Depth Freediving School & Diver Logbook — living spec

## What the app does
Public freediving-school website (home, courses, course detail, about, instructors) plus a private,
mobile-first diver logbook: dive log CRUD, automatic personal bests, goals, progress charts, a
generic training-table engine (CO2 / O2 / warm-up / custom) with a full-screen timer, training
history, learning resources, certifications and profile. Instructor and admin areas are included.

## Stack
FastAPI + motor (Mongo) backend on `/api`; Vite + React 19 + TS + Tailwind v4 frontend.
Auth is an httpOnly JWT cookie (`fd_session`); roles: `student`, `instructor`, `admin`.

## Data model (Mongo collections, string uuid `id`)
- `users` — name, email, password_hash (pbkdf2_sha256), role, profile_photo
- `diver_profiles` — user_id, freediving_since, certification_summary, preferred_discipline, …
- `courses` — title, slug, level, price, duration, learn_topics, structure, requirements, status
- `dive_logs` — user_id, date, discipline, value, unit, group, optional metrics, `is_pb`
- `personal_bests` — one doc per user+discipline, derived only (value, previous_value, improvement_percent)
- `goals` — user_id, discipline, target_value, target_date, status
- `training_tables` — name, category (co2|o2|warmup|custom), is_template, embedded `steps[]`
- `training_entries` — unified history: `source` = `session` (timer) or `manual`
- `learning_resources`, `certifications`, `instructor_students`, `instructor_notes`, `password_resets`
  - `certifications` also carry `status` (pending|verified|expired|rejected) — only `verified` grants access
  - `learning_resources` also carry `access_agency`, `minimum_access_level`, `minimum_level_rank`,
    `resource_access_type` (certification_level|course_enrollment|admin_only|public)

## Certification-based learning access (level ≠ role)
- `lib/levels.py` — generic agency→[(label, rank)] registry (AIDA 1–4, Molchanovs Waves, SSI Levels).
  Authorization compares integer ranks, never level strings, so new agencies are a data change.
- `lib/access.py` — `current_level(user_id)` derives the level from the **highest verified**
  certification; `effective_rank()` adds the super_admin `preview_rank` override;
  `sync_profile_level()` mirrors it onto `diver_profiles` for display only.
- Rule: `can_access(user_rank, minimum_rank)` → a diver reads their level and everything below it.
- Enforced server-side in `routers/content.py`: the list endpoint blanks `resource_url` for locked
  rows and `GET /api/learning-resources/{id}/open` returns **403** with
  "This resource requires AIDA N certification." — the locked URL is never sent to the client.
- `GET /api/learning-resources/summary` and `GET /api/certifications/level` power the learning
  banner, the dashboard learning card and the profile level card.
- Self-added certifications are forced to `pending` (no self-upgrade). Admin/super_admin manage them
  via `/api/admin/certifications` (assign, PATCH status/level, delete); access updates immediately,
  with no per-resource permission editing.
- Roles: `student`, `instructor`, `admin`, `super_admin`. Role controls what a user may *do*;
  certification level controls what educational content they may *read*.

## Key logic
- Disciplines: depth = CWT/CWTB/CNF/FIM/VWT/NLT, dynamic = DYN/DYNB/DNF, static = STA (value in seconds).
  Higher value is always better.
- PBs are never entered manually. `lib/pb.recalc_discipline_pb` rebuilds the PB doc from all dives of
  that discipline on every create/update/delete, so deleting a PB dive cannot leave a stale PB.
- Goal progress = current PB / target; status flips to `achieved` automatically.
- Training tables are one engine: an ordered `steps[]` of {step_order, step_type, duration_seconds,
  instruction}. Templates (`is_template`, user_id null) are read-only — duplicate to edit.
- Completing/stopping the timer POSTs `/api/training/sessions`, creating a `training_entries` row.

## Authorization
`lib/auth.assert_can_view` — a user sees their own data; admin sees everything; an instructor sees
only students linked via `instructor_students`. Dive/goal/table/cert writes are owner-only.

## Key routes (frontend)
Public `/`, `/courses`, `/courses/:slug`, `/about`, `/instructors`, `/login`, `/register`,
`/forgot-password`. Diver `/app`, `/app/dives`, `/app/dives/new`, `/app/dives/:id/edit`,
`/app/personal-bests`, `/app/progress`, `/app/goals`, `/app/training`,
`/app/training/tables/:id` (`new` for create), `/app/training/run/:id`, `/app/learning`,
`/app/certifications`, `/app/profile`. Staff `/instructor`, `/admin`.

## Seed (backend/seed.py, idempotent)
Alex Diver (AIDA 2, CWTB) with 19 dives, PBs CWTB 24 m / DYNB 75 m / STA 03:20, 3 goals,
7 training entries, 1 certification; Sara Blue (FIM 30 m); instructor John Doe assigned to all
students; 7 courses; 11 learning resources (AIDA 1–4 manuals + level-gated guides + one public
policy); 5 table templates (CO2 8-round, O2 5-round, 3 warm-ups).
Level-demo accounts: Super User (super_admin, AIDA 1–4 verified), Raka Freediver (AIDA 2, 16 dives,
2 goals, 3 sessions), Maya Freediver (AIDA 3, 18 dives, 2 goals, 5 sessions, 4 personal tables).
See memory/test_credentials.md for logins and the expected access matrix.

## Known deviations
- Forgot-password returns the reset token in the API response (no mail provider configured).
- No course booking/payment, no PDF hosting (admin-configured external links only), no PWA.
- Course enrollment is not built yet, so `resource_access_type = course_enrollment` is accepted and
  stored (and treated as ungated) but no enrollment check exists — AIDA manuals use
  `certification_level` as specified.
