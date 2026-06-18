# PHASE 2.5 — Password setup + email/password login (spec for MASTER.md)

## Goal
Replace auto-login magic link with: buyer clicks welcome link → /setup (token-validated) → sets password → dashboard. Returning users log in with email + password. Magic link kept only as forgot-password fallback.

## Decisions (locked)
- Account is pre-created by wh-purchase-47 (Option A) — /setup attaches a password to the existing enrolled account, does NOT create it.
- Setup link carries a one-time token (Option a) — only the real buyer can claim the account.
- Required, not optional: first-time users must set a password to reach the dashboard.
- Enrollment is the purchase proof (already verified by the webhook at purchase time). /setup checks "enrolled account exists for this email" — no re-check against GHL.
- New buyers only — existing test accounts wiped, no migration.

## Flow
1. Purchase → wh-purchase-47 creates enrolled account + generates a setup token → writes PORTAL_BASE_URL/setup?token=XXX into GHL portal_setup_url.
2. Buyer clicks → /setup validates token → shows email (read-only, prefilled) + new-password field.
3. Submit → set password on the existing account → log in → dashboard.
4. Returning users → login page: email + password (signInWithPassword).
5. Forgot password → "email me a link" → magic link (existing signInWithOtp) as fallback.
6. Invalid/expired token, or no enrolled account → "Email is not registered."

## Changes required
- **wh-purchase-47**: stop generating an auto-login magiclink. Instead generate a setup token (Supabase generateLink type=recovery OR a signed one-time token), point portal_setup_url at /setup?token=XXX. Account creation, enrollment, never_activated tagging unchanged.
- **New /setup route + screen**: validate token → prefilled read-only email + password field + confirm → call updateUser({password}) (or verifyOtp(recovery)+updateUser) → redirect to dashboard. Error states: invalid/expired token, not enrolled, weak password.
- **LoginScreen**: add password field + signInWithPassword as primary path. Keep "email me a link instead" → existing signInWithOtp as fallback. Keep 30s cooldown on the fallback.
- **Supabase config**: enable email+password auth (currently OTP-only). Confirm password min length.
- **/auth/callback**: keep for the magic-link fallback path; no longer the primary buyer entry.

## Out of scope
Events, ads, upsell, segments, $497 — unchanged. This phase only touches auth.

## EXIT test
1. Test $47 purchase → welcome email link is /setup?token=XXX (not an auto-login link).
2. Click → /setup shows the purchase email prefilled + password field (does NOT drop into dashboard).
3. Set password → lands in dashboard authenticated; My Courses shows the course.
4. Log out → login page → email + password → straight into dashboard, no email hop.
5. Wrong/guessed email or tampered token → "Email is not registered."
6. "Forgot password" → magic link arrives → logs in.
7. Re-use the same setup token after it's claimed → rejected.
