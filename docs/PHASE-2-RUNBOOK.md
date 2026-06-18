# Phase 2 — Runbook (provision → deploy → EXIT)

Linked project ref: **`xbeuuibbllcvyovpmpak`**. This runbook applies the schema,
deploys the `wh-purchase-47` Edge Function, and lists every secret + where it
comes from. **No secret values are stored in this repo.**

---

## 0. Prereqts / what the agent still needs from you

Applying schema (DDL) and deploying functions require **one** of:
- the **database password** (Dashboard → Project Settings → Database → *Database password* / "Reset"), or
- a **Supabase personal access token** `sbp_…` (https://supabase.com/dashboard/account/tokens).

Plus GHL values for the Edge secrets (section 3).

---

## 1. Link the project (one-time)

```bash
supabase login                       # opens browser; or: export SUPABASE_ACCESS_TOKEN=sbp_xxx
supabase link --project-ref xbeuuibbllcvyovpmpak
```

## 2. Apply the schema

```bash
supabase db push                     # runs migrations 0001→0004 against the linked project
```
Migrations:
- `0001_init_schema.sql` — all §3 tables, FKs, enum CHECKs, idempotency uniques
- `0002_rls_policies.sql` — RLS on every table
- `0003_seed_catalog.sql` — course "The E-commerce Launch Blueprint" + 4 modules / 13 lessons + segment_config
- `0004_read_functions.sql` — `get_enrolled_courses()`

Verify: `select slug, title from courses;` → one row; `select count(*) from lessons;` → 13.

## 3. Edge Function secrets + deploy

Copy `supabase/functions/.env.example` → `supabase/functions/.env`, fill in, then:
```bash
supabase secrets set --env-file supabase/functions/.env
supabase functions deploy wh-purchase-47
```
`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected — do **not** set them.

## 4. Supabase Auth config (Dashboard → Authentication → URL Configuration)

- **Site URL:** your portal URL (e.g. `http://localhost:3000`, later the Vercel URL)
- **Redirect URLs:** add `<portal>/auth/callback`
- Email provider: ensure magic-link / OTP email template is enabled.

## 5. GHL wiring (Phase 0 carryover)

- The `$47 purchase fire(Outbound)` workflow must **POST the purchase payload** to the function URL
  `https://xbeuuibbllcvyovpmpak.supabase.co/functions/v1/wh-purchase-47`
  with header **`x-webhook-secret: <WH_PURCHASE_47_SECRET>`**.
- A **welcome-email** step that sends the contact field **`portal_setup_url`** as the login link.

### How to find `GHL_SETUP_URL_FIELD_ID`
1. GHL → **Settings → Custom Fields** → create (or open) a **Contact** field named `portal_setup_url` (type: Single Line / URL).
2. Get its id one of two ways:
   - **API:** `GET https://services.leadconnectorhq.com/locations/{GHL_LOCATION_ID}/customFields`
     with headers `Authorization: Bearer <GHL_PIT_TOKEN>`, `Version: 2021-07-28`.
     Find the entry whose `fieldKey`/`name` is `portal_setup_url`; copy its `id`.
   - **URL:** open the field in the GHL UI; the id is the last path segment.
3. Put that id in `GHL_SETUP_URL_FIELD_ID`.

---

## Secrets reference (where each comes from)

| Secret | Where it lives | Source |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel | Dashboard → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Dashboard → API → `anon` public key |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-injected into Edge | (never set manually; never in browser) |
| `WH_PURCHASE_47_SECRET` | Edge secret + GHL header | invent a long random string; paste same value both places |
| `GHL_PIT_TOKEN` | Edge secret | GHL → Settings → Private Integrations → token |
| `GHL_LOCATION_ID` | Edge secret | `4rsssMJDYkokbMDPoL16` (from payload `location.id`) |
| `GHL_SETUP_URL_FIELD_ID` | Edge secret | section 5 above |
| `PORTAL_BASE_URL` | Edge secret | portal URL (magic-link redirect base) |
| `COURSE_47_SLUG` | Edge secret (default ok) | `ecommerce-launch-blueprint` |
| `EXPECTED_47_PRODUCT_TITLE` | Edge secret (default ok) | `$47 The E-commerce Launch Blueprint` |

---

## MASTER.md §6 — Phase 2 EXIT (run manually; do NOT self-certify)

1. **GHL test purchase** of the $47 product fires the workflow → POST to `wh-purchase-47`.
2. **Account exists:** `select * from auth.users;` shows the buyer; `profiles`, `enrollments`
   (segment `never_activated` in `user_segments`) populated; `ghl_sync_log` has a `wh-purchase-47`
   success row.
3. **Welcome email link logs you in:** the email's `portal_setup_url` → `/auth/callback` → portal opens authenticated.
4. **My Courses shows the course:** the grid shows "The E-commerce Launch Blueprint" (0 of 13 lessons).
5. Re-fire the same purchase → `ghl_sync_log` shows a dedupe (no duplicate user/enrollment).
