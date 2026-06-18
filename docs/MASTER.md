# COURSE PORTAL — MASTER BUILD FILE
**Single source of truth. If any other file conflicts with this one, this one wins.**
Companion files: `DESIGN-BRIEF.md` (Claude Design input) · `CONNECTION-MAP.md` (Cursor/Claude Code input)

---

## 1. Project summary

A web portal where buyers of the **$47 course** watch content. Its one revenue job: convert $47 buyers into **$497 DFY buyers** via (a) a per-module upsell panel, (b) rule-based in-video upsell ads, and (c) behavioral tracking that keeps exactly one segment tag per contact synced to GoHighLevel (GHL), which runs all email sequences.

Built as a **reusable platform**: single course in v1, but every table carries `course_id` and all course-specific content (modules, lessons, upsell copy, ad rules, segment thresholds) is data/config, never code.

Out of scope: $497 checkout page (GHL), $497→$1997 upsell (human call), all email content (GHL), admin panel (later phase), analytics dashboard (later phase).

## 2. Locked decisions

| # | Decision | Value |
|---|---|---|
| D1 | Lesson completion | Auto at **90% watched** (Vimeo Player API). Manual "Mark complete" button ONLY for lessons with no video |
| D2 | In-video pop ad | **Rule-based** engine (rules in `ad_rules` config, e.g. "midpoint of every lesson video", skippable after N seconds) |
| D3 | Per-lesson GHL event | **Every** lesson completion fires an outbound event to a GHL webhook/workflow (generic trigger→action config, not hardcoded) |
| D4 | v1 scope | **Single-course extensible** — UI shows one course; schema is multi-course from day one |
| D5 | Stack | **Supabase**: Auth (email+password primary, magic-link fallback — Phase 2.5, see §8 TC1), Postgres, `pg_cron` + `pg_net` for daily segment job, Edge Functions for GHL API |
| D6 | Toolchain | Claude Design (frontend) → Cursor + Claude Code (implementation) → Vercel (deploy) |
| D7 | Video | Vimeo embeds via official Player API (`player.js`). No Video.js |
| D8 | Source of truth for behavior | Append-only `events` table; segments and GHL pushes are derived from it |

## 3. Data model (canonical)

```
courses(id, slug, title, status)
modules(id, course_id, sort, title)
lessons(id, module_id, sort, title, vimeo_id NULLABLE, description, resources JSONB)
users            -- Supabase auth.users + profiles(user_id, ghl_contact_id, email)
enrollments(id, user_id, course_id, source, created_at)
lesson_progress(id, user_id, lesson_id, seconds_watched, pct, completed_at NULLABLE, last_position)
events(id, user_id, course_id, type, payload JSONB, created_at)
  -- type ∈ login | lesson_started | lesson_completed | course_completed
  --        | upsell_view | upsell_click | ad_view | ad_skip | ad_click
upsell_config(id, course_id, module_id NULLABLE, placement, headline, body, cta_label, cta_url, intensity)
  -- placement ∈ rail | sidebar_promo | completion ; sidebar_promo rows have module_id NULL (global)
ad_rules(id, course_id, scope, trigger_type, trigger_value, skippable_after_s, asset_url, cta_url, active)
  -- scope: course|module|lesson; trigger_type: pct|timestamp_s
segment_config(course_id, stalled_after_days, never_activated_after_days, ...)
user_segments(user_id, course_id, segment, changed_at)  -- current segment, one row per user+course
ghl_sync_log(id, user_id, action, tag, status, response, created_at)  -- audit trail
```

## 4. The six segments (state machine)

| Segment | Definition | GHL tag |
|---|---|---|
| never_activated | Enrolled, never logged in (after X days) | `seg_never_activated` |
| not_started | Logged in, zero `lesson_started` events | `seg_not_started` |
| active | Has progress within recency window, not complete | `seg_active` |
| stalled | Started, silent > stalled_after_days, not complete | `seg_stalled` |
| completer | `course_completed` event exists | `seg_completer` |
| dfy_purchased | $497 purchase webhook received | `seg_dfy_purchased` (terminal; suppress all) |

Rules: exactly **one** segment tag per contact at all times. On transition: add new tag, remove old tag, log to `ghl_sync_log`. Time-based transitions (never_activated, stalled) computed by the **daily pg_cron job**; everything else is event-driven in real time.

## 5. GHL integration contract

**Inbound (GHL → portal, Supabase Edge Functions):**
- `POST /webhooks/purchase-47` → create user + enrollment, set segment never_activated, generate a one-time **recovery token** and store `PORTAL_BASE_URL/setup?token=…&email=…` as the setup URL → GHL sends welcome email with it. The buyer lands on `/setup` to attach a password (Phase 2.5, §8 TC1) — no auto-login link.
- `POST /webhooks/purchase-497` → set segment dfy_purchased

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

### PHASE 3 — Player + tracking engine (Cursor)
Vimeo Player API wiring (resume, timeupdate checkpoints every 10s, 90% → lesson_completed), event writes, per-lesson GHL push (D3), rule-based ad engine (pause → overlay → log ad_view/ad_skip/ad_click → resume).
**EXIT:** watch test lesson to 90% → event row + lesson_progress.completed_at set + GHL contact shows the event. Ad fires per rule, skip + click logged.

### PHASE 4 — Segment engine (Cursor)
Event-driven transitions + daily pg_cron job for time-based segments + tag swap edge function + dfy suppression.
**EXIT:** simulate all 6 journeys (manipulate timestamps in DB) → correct single tag in GHL each time; ghl_sync_log clean.

### PHASE 5 — Upsell panel (Cursor)
Render upsell_config per current module, escalation by intensity, CTA → GHL checkout, upsell_view/upsell_click events.
**EXIT:** clicks tracked; segment logic reflects upsell_click where configured.

### PHASE 6 — Hardening + deploy (Cursor)
Idempotency, retries, refund stub (access revocation flag), Vercel deploy, custom domain, production GHL keys, full live dry run with a real $47 test purchase.
**EXIT:** end-to-end production run: buy → email → login → watch → ad → complete → tags correct → upsell click correct.

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
