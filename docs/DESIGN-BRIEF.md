# COURSE PORTAL — DESIGN BRIEF v2 (Claude Design input, Phase 1)
**v2 changes: mandatory App Shell on all post-login screens · new Dashboard screen · landscape layout law · density rules. Build static frontend with fixture data only.**

---

## LAYOUT LAW (read first — v1 output violated this)

1. **Landscape app container, always.** The white app surface fills the viewport landscape (like a desktop SaaS app) with a thin periwinkle canvas margin (~32px). NEVER a portrait card floating in space. Min content width 1200px design target.
2. **App Shell S0 wraps every post-login screen.** No screen renders without it.
3. **No lonely elements.** Every screen must match the reference screenshot's information density. If a screen has one card and whitespace, it's wrong — add the supporting content defined below.

## S0 — App Shell (persistent)

**Left sidebar (240px, white):**
- Logo top
- Nav: **Dashboard** · **My Courses** · **Resources** · **Settings** (bottom-anchored)
- Active item: indigo text + 3px left indicator bar + soft indigo pill (per DESIGN-SYSTEM)
- Lavender promo card above Settings (illustration slot, 2-line text, outline button) — this is a permanent upsell touchpoint, fixture-driven
**Top bar:** page title/breadcrumb left · search icon, notification bell, avatar menu (with Logout) right

## Screens

### S1 — Login / Access (only screen WITHOUT shell)
Centered card on periwinkle canvas. Email + "Send me a login link". States: default · sending · sent · error (not enrolled). S1b: setup landing from welcome email → "Setting up your access…" → Dashboard.

### S2a — Dashboard (NEW — default screen after login)
Dense, reference-grade layout:
- Greeting header ("Welcome back, Sam") + meta line (last activity)
- **Continue Learning hero card** (large, left 2/3): lesson thumbnail, course + lesson title, progress bar, "Resume Lesson" primary button
- **Stats row** (3 small cards): Lessons completed (5/13) · Course progress (38%) · Watch time
- **Up next** row: 3 horizontally scrollable lesson thumbnail cards (duration chip + play overlay, exactly like reference "All Lessons" row)
- **Right rail:** module progress list (numbered circles ✓/current/upcoming, like reference right rail) + upsell panel (current intensity tier)

### S2b — My Courses
Header + left-aligned responsive card grid (v1 fixture: 1 course card, grid built for many). Card: cover, title, 2-line description, "5 of 13 lessons" + progress bar, Continue button. Empty state: dashed dropzone-style card with message. NOT a centered lonely card — grid starts top-left under the header.

### S3 — Course View (3-zone, inside shell)
- **Course sidebar zone** (inside content area, left): collapsible modules, lessons with ✓/▶/○ states, per-module n/m progress, nothing locked. Above it: "All Lessons" horizontal thumbnail row (reference style) that scrolls the active lesson into view.
- **Center:** Vimeo mock player (16:9, rounded, title overlay top-left like reference) · lesson title + description · resources row (icon tile + title + clamped description + circular download btn, exact reference recipe) · manual "Mark complete" button for no-video lessons · resume toast on partially-watched lessons
- **Right rail:** sticky upsell panel, 3 intensity tiers per DESIGN-SYSTEM · course-complete state swaps center for completion screen + max-intensity upsell

### O1 — Pop-ad overlay (unchanged from v1)
Scrim over paused player, centered card: 16:9 media slot, headline, full-width CTA, "Skip in Ns" → "Skip". States: locked countdown · skippable · clicked. Standalone component, props: asset, headline, ctaLabel, ctaUrl, skippableAfterS, onSkip, onClick, onClose. Keep dev "Trigger ad" control.

## Fixture data (fixtures.js)
1 course "AI Profit Systems" · 4 modules · 13 lessons (mix: completed, in-progress 40%, untouched, one no-video, two with resources) · stats for dashboard · 4 upsell_config (intensity 1,2,4,5) · sidebar promo content · 1 ad rule (50%, skip after 5s).

## Do NOT design
Admin panel · analytics beyond the 3 stat cards · multi-course management · email templates · $497 checkout (external link) · Schedule page (omit from nav).

## Acceptance checklist (design frozen when ALL pass)
- [ ] Every post-login screen is landscape, full-shell, reference-density
- [ ] S0 sidebar with active states + promo card + top bar on all screens
- [ ] S2a Dashboard: hero + stats + up-next row + right rail
- [ ] S2b grid + empty state, left-aligned
- [ ] S3: thumbnail row, module list 3 states, player recipe, resources, no-video manual complete, resume toast
- [ ] Upsell panel 3 tiers + course-complete max tier
- [ ] O1 all 3 states
- [ ] S1 all 4 states + S1b
- [ ] Responsive: sidebar → drawer, upsell rail → below player
