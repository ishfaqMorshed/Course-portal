# COURSE PORTAL — MASTER BUILD FILE
**Single source of truth. If any other file conflicts with this one, this one wins.**
Companion files: `DESIGN-BRIEF.md` (Claude Design input) · `CONNECTION-MAP.md` (Cursor/Claude Code input)

---

## 1. Project summary

A web portal where buyers of the **$47 course** watch content. Its one revenue job: convert $47 buyers into **$497 DFY buyers** via (a) a per-module upsell panel, (b) rule-based in-video upsell ads, and (c) behavioral tracking that keeps exactly one segment tag per contact synced to GoHighLevel (GHL), which runs all email sequences.

> **Status update (2026-06) — $47-only:** We currently sell **only the $47 course**. The **$497 DFY offer is not a live GHL product** — DFY/service sales happen **off-platform / manually**. The segment engine's active purpose is therefore **behavioral tracking of $47 buyers** so we can target them (via GHL email sequences + manual outreach) to sell our services. The `dfy_purchased` segment and the `wh-purchase-497` webhook remain built and in place but are **dormant/unused** — nothing fires them today. Leave them as-is; reactivate if a $497 product is ever wired into GHL. (This note supersedes the "$497 buyers" framing above and the §4/§5 `dfy_purchased`/purchase-497 entries.)

Built as a **reusable platform**: single course in v1, but every table carries `course_id` and all course-specific content (modules, lessons, upsell copy, ad rules, segment thresholds) is data/config, never code.

Out of scope: $497 checkout page (GHL), $497→$1997 upsell (human call), all email content (GHL), admin panel (later phase), analytics dashboard (later phase).

## 2. Locked decisions

| # | Decision | Value |
|---|---|---|
| D1 | Lesson completion | Auto at **70% watched** (provider Player APIs — Vimeo/YouTube/HTML5). Manual "Mark complete" button available on **every** lesson: the sole completion path for no-video lessons, and a manual override for video lessons (Phase 3 re-scope) |
| D2 | In-video pop ad | **Rule-based** engine (rules in `ad_rules` config, e.g. "midpoint of every lesson video", skippable after N seconds) |
| D3 | Per-lesson GHL event | **Every** lesson completion fires an outbound event to a GHL webhook/workflow (generic trigger→action config, not hardcoded) |
| D4 | v1 scope | **Single-course extensible** — UI shows one course; schema is multi-course from day one |
| D5 | Stack | **Supabase**: Auth (email+password primary, magic-link fallback — Phase 2.5, see §8 TC1), Postgres, `pg_cron` + `pg_net` for daily segment job, Edge Functions for GHL API |
| D6 | Toolchain | Claude Design (frontend) → Cursor + Claude Code (implementation) → Vercel (deploy) |
| D7 | Video | Vimeo embeds via official Player API (`player.js`). No Video.js |
| D8 | Source of truth for behavior | Append-only `events` table; segments and GHL pushes are derived from it |

## 3. Data model (canonical)

```
courses(id, slug, title, status, thumbnail_url NULLABLE)
  -- thumbnail_url (Phase 7) = course card art (Storage; rendered object-fit cover). NULL = placeholder.
modules(id, course_id, sort, title)
lessons(id, module_id, sort, title, vimeo_id NULLABLE, video_source, description, resources JSONB, thumbnail_url NULLABLE)
  -- video_source (Phase 2.7-fix, 0009) ∈ vimeo|youtube|url ; vimeo_id REUSED as the generic
  --   video ref: Vimeo ID, YouTube ID, or direct URL per video_source. NULL/'' = no-video lesson.
  -- thumbnail_url (Phase 7) = lesson card art (Storage; rendered object-fit cover). NULL = placeholder.
users            -- Supabase auth.users + profiles(user_id, ghl_contact_id, email, is_admin)
  -- is_admin boolean default false (Phase 2.7) — gates /admin + admin-write RLS
enrollments(id, user_id, course_id, source, created_at)
lesson_progress(id, user_id, lesson_id, seconds_watched, pct, completed_at NULLABLE, last_position)
events(id, user_id, course_id, type, payload JSONB, created_at)
  -- type ∈ login | lesson_started | lesson_completed | course_completed
  --        | upsell_view | upsell_click | ad_view | ad_skip | ad_click
upsell_config(id, course_id, module_id NULLABLE, placement, headline, body, cta_label, cta_url, intensity, image_url NULLABLE)
  -- placement ∈ rail | sidebar_promo | completion ; sidebar_promo rows have module_id NULL (global)
  -- image_url (Phase 2.7-fix, 0007) = promo art URL (no Storage; URL only)
ad_rules(id, course_id, scope, module_id NULLABLE, lesson_id NULLABLE, trigger_type, trigger_value, skippable_after_s, asset_url, cta_url, active, headline NULLABLE, cta_label NULLABLE)
  -- scope: course|module|lesson; trigger_type: pct|timestamp_s
  -- module_id/lesson_id (Phase 2.7, Option A) = scope target: NULL=course-wide; set for module/lesson scope
  -- asset_url = ad image; headline/cta_label (Phase 2.7-fix, 0007) = overlay copy (default to neutral text when blank)
segment_config(course_id, stalled_after_days, never_activated_after_days, ...)
user_segments(user_id, course_id, segment, changed_at)  -- current segment, one row per user+course
ghl_sync_log(id, user_id, action, tag, status, response, created_at)  -- audit trail
```

Read RPCs: `get_enrolled_courses()` (Phase 2), `get_course_tree(course_id)` (Phase 2.7-fix — live modules+lessons+per-user progress; the portal reads this instead of fixtures). Write RPC: `complete_lesson(lesson_id)` SECURITY INVOKER (Phase 3 — idempotently sets `lesson_progress.completed_at`, writes the `lesson_completed` event, and the `course_completed` event when all lessons are done; backed by unique partial indexes on `events` so each fires once per user+lesson / user+course). Admin RPC: `is_admin()` SECURITY DEFINER (Phase 2.7).

## 4. The six segments (state machine)

| Segment | Definition | GHL tag |
|---|---|---|
| never_activated | Enrolled, never logged in (after X days) | `seg_never_activated` |
| not_started | Logged in, zero `lesson_started` events | `seg_not_started` |
| active | Has progress within recency window, not complete | `seg_active` |
| stalled | Started, silent > stalled_after_days, not complete | `seg_stalled` |
| completer | `course_completed` event exists | `seg_completer` |
| dfy_purchased | $497 purchase webhook received | `seg_dfy_purchased` (terminal; suppress all) — **DORMANT (§1 status): no live $497 product; never set today** |

Rules: exactly **one** segment tag per contact at all times. On transition: add new tag, remove old tag, log to `ghl_sync_log`. Time-based transitions (never_activated, stalled) computed by the **daily pg_cron job**; everything else is event-driven in real time.

## 5. GHL integration contract

**Inbound (GHL → portal, Supabase Edge Functions):**
- `POST /webhooks/purchase-47` → create user + enrollment, set segment never_activated, generate a one-time **recovery token** and store `PORTAL_BASE_URL/setup?token=…&email=…` as the setup URL → GHL sends welcome email with it. The buyer lands on `/setup` to attach a password (Phase 2.5, §8 TC1) — no auto-login link.
- `POST /webhooks/purchase-497` → set segment dfy_purchased — **DORMANT (§1 status): built but unused; no live $497 GHL product points at it**

**Outbound (portal → GHL, API v2 with PIT token):**
- Tag add/remove on every segment transition
- `POST` to GHL inbound webhook on **every lesson completion** (D3) with `{contact_id, course, module, lesson}` — GHL workflow decides what to do with it

Idempotency: all inbound webhooks carry/derive an idempotency key; duplicates are no-ops. Outbound calls retry with backoff on 429/5xx; failures land in `ghl_sync_log` with status=failed.

## 6. Phase plan

### PHASE 0 — Prerequisites (no code)
**Track A (GHL, you):** PIT token · create 6 tags · confirm $47 + $497 purchase webhooks fire (test with webhook.site) · create GHL inbound webhook + workflow for lesson-completion events · decide welcome-email link format.
**Track B (content, you):** module/lesson list with Vimeo IDs · upsell copy per module (headline/body/CTA, intensity 1–5) · ad rule spec (trigger, skip seconds, asset, CTA) · brand basics (logo, colors, font).
**EXIT:** curl can add/remove a tag on a test contact · test purchase hits webhook.site · all Track B content exists in a doc.

### PHASE 1 — Frontend (Claude Design)
Input: `DESIGN-BRIEF.md`. Build all screens/states with fixture data, zero backend. Output: exported React components.
**EXIT:** every screen and state click-throughable; you approve; design frozen. Export handed to Cursor.

### PHASE 2 — Auth + data model (Cursor)
Supabase project, full schema + RLS, magic-link auth, purchase-47 webhook → user + enrollment + setup URL.
**EXIT:** GHL test purchase → account exists → welcome email link logs you in → My Courses shows the course.

### PHASE 2.5 — Password setup + email/password login (Cursor)
Spec: `docs/PHASE-2.5-SPEC.md` (implements §8 TC1). Replace the auto-login magic link with: welcome link → `/setup?token=…` (one-time **recovery** token) → buyer sets a password → dashboard. Returning users log in with email+password (`signInWithPassword`); magic link (`signInWithOtp`) kept only as the forgot-password fallback. New buyers only — existing test accounts wiped, no migration. **No schema change** — the recovery-token approach (token verified only on submit, so no session exists until a password is set) makes the `profiles.password_set` column from TC1 unnecessary.
Touches: `wh-purchase-47` (recovery token + `/setup` URL), new `/setup` route + screen, `LoginScreen` (password field + `signInWithPassword`), `supabase/config.toml` (email+password, `minimum_password_length`, `otp_expiry`, `enable_signup=false`) + matching hosted-dashboard Auth toggles. Out of scope: events, ads, upsell, segments, $497.
**EXIT:** run `docs/PHASE-2.5-SPEC.md` EXIT steps (welcome link → /setup → set password → dashboard; logout → email+password login; tampered token / wrong email → "Email is not registered."; forgot-password magic link; claimed token reuse rejected).

### PHASE 2.7 — Admin Dashboard (Cursor)  ← built before Phase 3
Spec: `docs/PHASE-2.7-ADMIN-SPEC.md`. Internal `/admin` tooling to enter real content/config that Phases 3–5 test against. `profiles.is_admin` flag (+ `ad_rules.module_id`/`lesson_id` targets, Option A); `public.is_admin()` SECURITY DEFINER helper; admin-write RLS on courses/modules/lessons/upsell_config/ad_rules/segment_config (read = enrolled OR admin; write = admin only; service role unaffected). Routes: `/admin` (server-layout guard + middleware), Courses (+ module/lesson editor with vimeo_id, resources, up/down reorder), Upsells (rail/sidebar_promo/completion), Ad Rules (scope + target picker), Segments (thresholds). Client-side CRUD through the RLS-gated admin session; no new edge functions or secrets. Out of scope: analytics, student mgmt, audit log.
**EXIT:** run `docs/PHASE-2.7-ADMIN-SPEC.md` EXIT steps (is_admin gate; create/edit lesson with real vimeo_id; no-video flag; edit rail/sidebar/completion upsells; create ad_rule; edit segment_config; reorder modules/lessons). Then resume Phase 3.

#### PHASE 2.7-fix — portal read-wiring + admin fixes (Cursor)
Follow-up to 2.7 (admin edits weren't appearing in the portal). Three things, all built: (1) **pulled `get_course_tree` forward from Phase 3** (`supabase/migrations/0006`) and wired the portal read path — CourseView, sidebar, All-Lessons row, resources, progress, the upsell panel (live `upsell_config`), the sidebar promo, and the ad engine (live `ad_rules`) now read from the DB, not fixtures; Dashboard wired live too (shared `progressMap`/`lib/course`). (2) Fixed admin write-masking — forms refetch after every write; deletes use `.select()` + row-count check so an RLS-denied delete errors instead of silently "succeeding". (3) Admin UX — admins land on `/admin` after login (portal still reachable); admin nav moved from a top bar to a left **sidebar shell** matching the portal. **Read-path only:** progress *writes*, `complete_lesson`, and event logging remain Phase 3. Known gap: `ad_rules` has no headline/cta-label columns → ad copy uses neutral defaults (asset_url/cta_url are live).
**EXIT:** admin edit to a module/lesson/upsell/ad → visible in the portal after reload; RLS-denied delete shows an error (not silent); admin login → `/admin`; admin nav is a left sidebar.

### PHASE 3 — Player + tracking engine (Cursor)  ← re-scoped (tree-read now done in 2.7-fix)
**Multi-source player** (Phase 2.7-fix added `lessons.video_source` ∈ vimeo|youtube|url): a `LessonPlayer` wrapper switches on `video_source` to one of **three provider adapters** behind a common `{percent, seconds, duration}` interface — **Vimeo** (`@vimeo/player`: `timeupdate`/`getDuration`/`setCurrentTime`), **YouTube** (IFrame API `YT.Player`: no native timeupdate → **poll** getCurrentTime/getDuration; `seekTo`), **Direct URL** (HTML5 `<video>`: `timeupdate`/`currentTime`/`duration`). Each does resume via `last_position`, 10s checkpoints, **70%** → `lesson_completed` (D1). A manual **"Mark complete"** button is shown on every lesson (sole path for no-video; override for video) and hits the same `complete_lesson` path. The tracking engine stays provider-agnostic: progress **writes** to `lesson_progress`, the `track(type,payload)` event helper (incl. `lesson_started` + ad_view/ad_skip/ad_click; upsell_view/click stay Phase 5), `complete_lesson` RPC, and `push-lesson-event` edge fn (D3). The ad engine's `timestamp_s` becomes real per provider (2.7 uses a mock-pct approximation). The live read path (`get_course_tree`, upsell/ad config) is already wired (2.7-fix) — Phase 3 does NOT re-do it. New deps: `@vimeo/player` + YouTube IFrame API. Depends on Phase 2.7 for real video refs + config.
**EXIT:** watch test lesson to 70% → event row + `lesson_progress.completed_at` set + GHL contact shows the event. Manual "Mark complete" on a video lesson and a no-video lesson both complete + push once. Reload resumes from `last_position`. Ad fires per rule, skip + click logged.

### PHASE 4 — Segment engine (Cursor)
Event-driven transitions + daily pg_cron job for time-based segments + tag swap edge function + dfy suppression.
Purpose (§1 status): **behavioral tracking of $47 buyers** to target them for our services (GHL sequences + manual outreach). The `dfy_purchased`/`wh-purchase-497` pieces are built but **dormant** — exercise the 5 live segments; `dfy_purchased` is verifiable but not in active use.
**EXIT:** simulate all 6 journeys (manipulate timestamps in DB) → correct single tag in GHL each time; ghl_sync_log clean.

### PHASE 5 — Upsell panel (Cursor)
Render upsell_config per current module, escalation by intensity, CTA → GHL checkout, upsell_view/upsell_click events.
**EXIT:** clicks tracked; segment logic reflects upsell_click where configured.

### PHASE 6 — Hardening + deploy (Cursor)
Idempotency, retries, refund stub (access revocation flag), Vercel deploy, custom domain, production GHL keys, full live dry run with a real $47 test purchase.
**EXIT:** end-to-end production run: buy → email → login → watch → ad → complete → tags correct → upsell click correct.

### PHASE 7 — Admin analytics + student management + thumbnails + login fix (Cursor)
Four things, all admin-facing except the login fix and thumbnail rendering:
1. **Admin analytics dashboard** (`/admin` analytics view): **revenue** = simple `count(enrollments) × $47` (no live $497, §1 status); **enrollment totals**; **segment distribution** bar/pie from `user_segments`; **upsell + ad engagement** bar/pie (counts of `upsell_view`/`upsell_click`/`ad_view`/`ad_skip`/`ad_click`) derived from the `events` table. Read-only aggregates — no new event types, no new tables.
2. **Student management:** a student list (email · progress % · current segment · enrollment date), **filterable** (by segment/course) and **exportable** (CSV). Reads `enrollments` + `lesson_progress` + `user_segments` + `profiles` (admin-gated, `is_admin()`).
3. **Course/lesson thumbnails:** new `courses.thumbnail_url` + `lessons.thumbnail_url` (Section 3 updated); image upload to a public Storage bucket (public read; admin-only write via `is_admin()`, like `upsell-images`); upload widgets in the admin course/lesson editors; the portal renders them **object-fit cover** on course cards + lesson thumbs (replaces placeholders).
4. **Student blank-page login fix:** students currently see a blank screen until they click Dashboard — fix the initial screen/default route so an authed student lands on the Dashboard immediately on login.

Schema: adds `thumbnail_url` to `courses` + `lessons` (Working-Rule-3 → Section 3 updated above). New Storage bucket(s) for thumbnails. Out of scope: time-series/cohort analytics, per-student drill-down, refund processing.
**EXIT:** analytics shows correct revenue (= enrolled × $47), enrollment count, a segment chart, and upsell/ad engagement counts that match the `events` table; student list filters + CSV export work; course/lesson thumbnail upload → renders cover-fit in the portal; a freshly-logged-in student sees the Dashboard with no blank screen.

## 7. Working rules

1. One phase per Claude Code session. Open the session by pasting MASTER.md + CONNECTION-MAP.md and stating the phase number.
2. No phase starts until the previous phase's EXIT test passes — verified by you, not the agent.
3. Schema changes after Phase 2 require updating Section 3 here first.
4. Frontend from Phase 1 is wired progressively, never rebuilt.

## 8. Tracked changes / later phases

Approved direction changes captured here so they are not lost. **None of these are implemented yet** — they are built only when their phase is scheduled. Do not act on this section during the current phase.

### TC1 — Email + password login for returning users  ✅ IMPLEMENTED in Phase 2.5
> Built per `docs/PHASE-2.5-SPEC.md`. The "implied changes" below are the original capture; two diverged in the build and are noted inline: the setup URL carries a **one-time recovery token to `/setup`** (not an auto-login link), and the **`profiles.password_set` column was NOT added** (the recovery token is verified only on submit, so no session exists until a password is set — the gate stays purely session-based).

**Decision:** Returning-user login supports **email + password** as the primary method. The password is set by the user during **first-time setup** (the `/setup?token=…` link from the welcome email). **Magic link is kept as a fallback** (forgot-password / passwordless sign-in).
**Reason:** A paid course means frequent logins. Requiring the email round-trip on every login is poor UX; an email-hop on *every* sign-in is unacceptable for a returning paying customer. First-time entry stays passwordless (no credential to type before the account is theirs).
**Supersedes:** D5 "Auth (magic link)" — to become "Auth (email+password, magic-link fallback)" when implemented.

Implied changes — **list only, do not implement now:**
- **Auth config (Supabase):** enable the Email provider's **password** sign-in (currently magic-link / OTP only). Keep magic-link / OTP enabled for the fallback path. Configure password policy (min length) and the password-reset email template.
- **First-time setup flow:** ✅ new `/setup` route + screen — validates a one-time recovery token on submit (`verifyOtp({type:'recovery'})`), then `auth.updateUser({ password })`, then redirects to the dashboard. (Diverged from "auto-login then set password": no session is created until the password is submitted.)
- **Login screen (frontend):** ✅ email + password primary (`signInWithPassword`); magic-link demoted to an "email me a login link instead" forgot-password action. Wire only — brand panel structure unchanged.
- **Schema (Section 3):** ⛔ NOT done — deliberately skipped. The `profiles.password_set` column proved unnecessary because the recovery token is verified only on submit, so an authenticated session never exists without a password. Section 3 unchanged (no Working-Rule-3 schema change).
- **Webhook (purchase-47):** ✅ account creation/enrollment/segment unchanged; it now issues a recovery token and stores `PORTAL_BASE_URL/setup?token=…&email=…` as `portal_setup_url` (was an auto-login magiclink).
