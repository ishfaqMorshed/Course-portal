# PHASE 2.7 — Admin Dashboard (spec for MASTER.md)

## Why now (before Phase 3)
Phase 3 needs real Vimeo IDs and real lesson content entered; Phases 4–5 need real upsell/ad/segment config to test against. The admin UI is the tool to enter all of it. So it precedes Phase 3.

## Decisions (locked)
- Access: Supabase admin role (NOT hardcoded, NOT env password). An `is_admin` boolean on profiles; only admins reach /admin.
- Location: same Next.js app, routes under `/admin`, shares existing auth + Supabase client.
- Scope: full content + config management (the four areas below). Analytics + student management deferred to a later phase.

## Access control
- Add `is_admin boolean not null default false` to `profiles` (schema change — update MASTER §3).
- Set your own account's is_admin = true via SQL (one-time, provided in runbook).
- `/admin/*` routes: server-side guard — load profile, if not is_admin → redirect to `/` (or 404). Middleware-enforced, not client-only.
- RLS: admin-write policies on courses/modules/lessons/upsell_config/ad_rules/segment_config gated on `is_admin = true`. Non-admins keep read-only-if-enrolled. Service role unaffected.

## Features (all of scope 2)

### A. Course / Module / Lesson management
- List courses; create/edit course (slug, title, status).
- Within a course: list modules ordered by sort; create/edit/reorder modules (title, sort).
- Within a module: list lessons ordered by sort; create/edit/reorder lessons.
- Lesson editor fields: title, sort, **vimeo_id** (nullable → no-video flag), description, resources (add/remove file entries: label + url).
- Reorder = drag or up/down buttons updating `sort`.

### B. Upsell config (all 3 placements)
- Edit per-module **rail** upsell: headline, body, cta_label, cta_url, intensity (1–5).
- Edit the global **sidebar_promo** (module_id null): same fields.
- Edit the **completion** upsell: same fields.
- One screen listing all upsell_config rows grouped by placement, each editable.

### C. Ad rules
- List ad_rules for a course; create/edit/delete.
- Fields: scope (course/module/lesson + target picker), trigger_type (pct/timestamp_s), trigger_value, skippable_after_s, asset_url, cta_url, active toggle.

### D. Segment thresholds
- Edit segment_config per course: stalled_after_days, never_activated_after_days.

## UI
- New `/admin` section with its own simple nav (Courses · Upsells · Ad Rules · Segments).
- Reuse DESIGN-SYSTEM tokens for visual consistency; this is internal tooling so function over polish — clean forms, not the full brand shell.
- Forms write directly to the existing tables via the authenticated admin session (RLS allows because is_admin).

## Out of scope (later phase)
Analytics dashboard, student/enrollment management, manual access revocation, multi-admin management, audit log.

## Schema change
- `profiles.is_admin boolean not null default false` (only change). Update MASTER §3.

## EXIT test
1. Set own account is_admin=true → /admin loads; a non-admin account → /admin redirects away.
2. Create/edit a lesson with a real vimeo_id → persists, visible in the course view.
3. Mark a lesson no-video (null vimeo_id) → course view shows manual complete button.
4. Edit a module's rail upsell (headline/intensity) → change shows in the portal upsell panel.
5. Edit sidebar_promo + completion upsell → both reflect in portal.
6. Create an ad_rule (50% pct, skip 5s) → appears for the lesson.
7. Edit segment_config days → value persists.
8. Reorder modules/lessons → order changes in portal sidebar.
