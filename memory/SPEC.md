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
7 training entries, 1 certification; Sara Blue (FIM 30 m); instructor John Doe assigned to both;
7 courses; 8 learning resources; 5 table templates (CO2 8-round, O2 5-round, 3 warm-ups).

## Known deviations
- Forgot-password returns the reset token in the API response (no mail provider configured).
- No course booking/payment, no PDF hosting (admin-configured external links only), no PWA.
