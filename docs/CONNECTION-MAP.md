# COURSE PORTAL — CONNECTION MAP (Cursor / Claude Code input)
**How the Phase 1 frontend wires to the Supabase backend. Read together with MASTER.md. Never invent endpoints or tables not listed here — if something is missing, stop and ask.**

---

## 0. Environment

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server/edge only
GHL_PIT_TOKEN=                    # edge functions only, never client
GHL_LOCATION_ID=
GHL_LESSON_EVENT_WEBHOOK_URL=     # GHL inbound webhook for per-lesson events
PORTAL_BASE_URL=
```
Rule: GHL credentials never reach the browser. All GHL calls go through Edge Functions.

## 1. Component → data source map

| Frontend (Phase 1 component) | Replace fixture with | Backend source |
|---|---|---|
| S1 Login | `supabase.auth.signInWithPassword({email,password})` (primary); "email me a login link instead" = `signInWithOtp({email})` forgot-password fallback, 30s client-side cooldown | Supabase Auth (email+password, magic-link fallback) — Phase 2.5 |
| S1c Setup (`/setup?token=…`) | `verifyOtp({type:'recovery',token_hash})` → `updateUser({password})` → dashboard; token verified on submit (one-time) | Supabase Auth — Phase 2.5 |
| S1b Setup landing (magic-link fallback) | token exchange on `/auth/callback` (`exchangeCodeForSession` / `verifyOtp`) | Supabase Auth |
| S0 Shell sidebar promo card | `get_upsell(course_id, placement='sidebar_promo')` | upsell_config |
| S2a Dashboard hero (Continue Learning) | `get_resume_target(user)` — most recent lesson_progress with completed_at NULL, else next uncompleted | lesson_progress + lessons |
| S2a Stats row | `get_dashboard_stats(user, course_id)` — lessons done n/m, pct, watch time = SUM(seconds_watched) | lesson_progress view |
| S2a Up-next row | next 3 uncompleted lessons in course order | lessons LEFT JOIN lesson_progress |
| S2a Right-rail module progress | same `get_course_tree` as S3 sidebar (shared hook) | modules + lessons + lesson_progress |
| S2b My Courses grid | `get_enrolled_courses(user)` | view joining enrollments→courses + progress % |
| S3 Sidebar | `get_course_tree(course_id)` ✅ wired (Phase 2.7-fix) | modules + lessons LEFT JOIN lesson_progress |
| S3 Player resume | `lesson_progress.last_position` (read via get_course_tree; *writes* Phase 3) | lesson_progress |
| S3 Resources row | `lessons.resources` JSONB ✅ wired (via get_course_tree) | lessons |
| S3 Upsell panel (right rail) | live `upsell_config` rows → resolved client-side (rail by current module; completion on course-complete; sidebar_promo = shell promo) ✅ wired (Phase 2.7-fix) | upsell_config |
| O1 Ad overlay props | live `ad_rules` → resolved client-side, most specific scope wins lesson > module > course ✅ wired. Both pct & timestamp_s fire (timestamp_s mock-approximated vs simSeconds in 2.7; exact seconds Phase 3). headline/cta_label/asset_url editable (0007); blank copy → neutral defaults | ad_rules |
| Manual Mark-complete btn | `rpc complete_lesson(lesson_id)` | same path as auto-complete (below) |

## 2. Event emission map (UI action → events row → side effects)

| UI trigger | events.type | Side effect |
|---|---|---|
| Successful auth callback | `login` | may transition never_activated → not_started |
| First `play` on a lesson | `lesson_started` | may transition not_started → active |
| Vimeo `timeupdate` ≥ 90% (once) OR manual button | `lesson_completed` | set lesson_progress.completed_at · **call edge fn `push-lesson-event` → GHL webhook (D3)** · if all lessons done → emit `course_completed` |
| All lessons complete | `course_completed` | transition → completer |
| Upsell panel rendered for new module | `upsell_view` | none |
| Upsell CTA click | `upsell_click` | log; window.open(cta_url) |
| Ad overlay shown | `ad_view` | none |
| Ad skip / ad CTA click | `ad_skip` / `ad_click` | log; ad_click opens cta_url |

Implementation rule: ONE client helper `track(type, payload)` inserts into `events` (RLS: user can insert own rows only). Postgres trigger on `events` calls segment-transition function for the event-driven transitions; never compute segments in the client.

## 3. Vimeo player wiring (S3 center)

```ts
import Player from '@vimeo/player';
const p = new Player(iframeEl);
p.on('play',  () => once(track('lesson_started')));
p.on('timeupdate', ({percent, seconds}) => {
  throttle10s(saveProgress(lesson_id, seconds, percent)); // upsert lesson_progress
  if (percent >= 0.9) once(completeLesson(lesson_id));     // rpc → event + GHL push
  checkAdRules(percent, seconds);                          // section 4
});
p.on('loaded', () => p.setCurrentTime(last_position));     // resume
```
`once()` = fire exactly one time per lesson per session; server side also enforces idempotency (unique partial index on completed events).

## 4. Ad engine wiring (O1)

1. On lesson load, fetch matching `ad_rules` (active, scope precedence lesson>module>course).
2. In `timeupdate`, when `percent*100 >= trigger_value` (pct) or `seconds >= trigger_value` (timestamp_s) and rule not yet fired this session: `p.pause()` → mount O1 with rule props → `track('ad_view')`.
3. `onSkip` (after skippable_after_s): `track('ad_skip')` → unmount → `p.play()`.
4. `onClick`: `track('ad_click')` → `window.open(cta_url)` → unmount → `p.play()`.
5. Mark rule as fired in session state so seeking backwards never re-triggers.

## 5. Edge Functions (the only server code)

| Function | Trigger | Does |
|---|---|---|
| `wh-purchase-47` | GHL webhook | upsert user+profile (store ghl_contact_id) · enrollment · segment=never_activated+tag · generate magic setup link · return it to GHL (or write to contact custom field) |
| `wh-purchase-497` | GHL webhook | segment=dfy_purchased · remove old tag, add dfy tag |
| `sync-segment-tag` | Postgres trigger via pg_net | GHL API v2: add new tag, remove old, write ghl_sync_log; retry/backoff on 429/5xx |
| `push-lesson-event` | rpc complete_lesson | POST {email, contact_id, course, module, lesson, lesson_id, completed_at} to GHL_LESSON_EVENT_WEBHOOK_URL. **email is MANDATORY — GHL inbound webhooks resolve the contact by email, NOT contact_id (confirmed in testing). GHL workflow: Inbound Webhook → Find Contact (by email) → Add Note.** |

Both webhooks: verify shared secret header; idempotency key = GHL event id (store in ghl_sync_log; duplicate → 200 no-op).

## 6. Daily segment job (pg_cron, runs 03:00 UTC)

```sql
-- pseudo: for each enrollment not completer/dfy:
--   no login ever AND now-enrolled_at > never_activated_after_days  → never_activated
--   login but no lesson_started                                      → not_started
--   lesson_started AND last event older than stalled_after_days      → stalled
--   else                                                             → active
-- on change: update user_segments, pg_net → sync-segment-tag
```
Thresholds read from `segment_config` per course. Job must be idempotent (re-run = no duplicate GHL calls when segment unchanged).

## 7. Phase-by-phase wiring order (what Claude Code does each session)

| Phase | Wire up | Leave mocked |
|---|---|---|
| 2 | Section 0, 1 (auth + My Courses read), `wh-purchase-47` | course tree, events, ads, upsell (fixtures) |
| 2.7 | Admin Dashboard (content/config CRUD, is_admin RLS) | — |
| 2.7-fix | `get_course_tree` + live portal reads (CourseView/Dashboard/sidebar/resources/upsell/ad **config**); admin write-masking fixes; admin sidebar shell | progress *writes*, events, GHL push (Phase 3) |
| 3 | Section 2 (events via `track`), Section 3 (real Vimeo player + progress writes + `complete_lesson`), Section 4 (ad *events*), `push-lesson-event` | segment tags (log only) |
| 4 | Sections 5 (`sync-segment-tag`, `wh-purchase-497`), 6 | — |
| 5 | Upsell events (config already live in 2.7-fix) | — |
| 6 | Hardening: retries, idempotency audit, deploy | — |

## 8. Guardrails for the agent

1. Do not modify Phase 1 components' visual structure — only swap fixtures for data hooks.
2. Do not add tables/endpoints beyond MASTER.md §3 and this file. Missing something → ask.
3. Every GHL call must write a ghl_sync_log row, success or failure.
4. All writes RLS-protected; service role only inside Edge Functions.
5. After each phase, output the EXIT test steps from MASTER.md §6 for the human to run. Do not self-certify.

## 9. Admin Dashboard (Phase 2.7)

Internal `/admin` tooling for content/config entry (no new env, no edge functions).
- **Access:** `profiles.is_admin` boolean; `public.is_admin()` SECURITY DEFINER helper. Guard = server layout (`app/admin/layout.tsx`) + middleware, never client-only. Grant via one-time SQL.
- **Writes:** client-side CRUD through the authenticated admin session, gated by admin-write RLS (`is_admin()`) on courses/modules/lessons/upsell_config/ad_rules/segment_config. Reads on those tables = enrolled OR admin. `segment_config` gains admin read/write; `ghl_sync_log` stays service-only.
- **ad_rules targeting (Option A):** added `module_id`/`lesson_id` columns → the §4 "lesson > module > course" precedence is now expressible (NULL target = course-wide).
- **UI (Phase 2.7-fix):** admin nav is a left **sidebar shell** matching the portal; admins land on `/admin` after login (portal still reachable via "Back to portal"). Writes **refetch** after every mutation; deletes use `.select()` + row-count check so RLS-denied deletes error instead of silently succeeding.
- **Read sync (Phase 2.7-fix):** the portal reads admin-entered content/config live via `get_course_tree` + `upsell_config`/`ad_rules` selects, so admin edits appear in the portal (after reload).
- **Media/copy (0007):** `upsell_config.image_url` (promo art) renders in the upsell panel + sidebar promo at natural aspect ratio (object-contain, capped height). `ad_rules.headline`/`cta_label` make the ad overlay copy editable (asset_url = ad image). Admin URL fields are normalized on save (`lib/url.ts` — collapses `https://https://`, adds a missing scheme, rejects invalid).
- **Storage (0008):** upsell promo art is uploaded to the public `upsell-images` bucket (public read; admin-only write via `is_admin()`); the public URL is stored in `image_url`. Upload widget in the admin upsell editor (`lib/admin/storage.ts`).
- **Multi-source video (0009):** `lessons.video_source` ∈ vimeo|youtube|url; `vimeo_id` reused as the generic ref (id or URL), normalized in the admin editor (`lib/video.ts`). `get_course_tree` returns `video_source`. Player adapters are **Phase 3** (see MASTER §6 Phase 3) — 2.7 still uses the mock player, which now surfaces source + ref for verification.
