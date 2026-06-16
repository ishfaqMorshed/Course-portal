# COURSE PORTAL — DESIGN SYSTEM
**Extracted from reference screenshot. This is the visual law. Layout may adapt to our features (DESIGN-BRIEF.md), but every token here is fixed — the build must look like the reference's sibling.**

---

## 1. Color tokens

```css
/* Canvas & surfaces */
--bg-canvas:        #C9CCF1;  /* outer page wash — soft periwinkle */
--bg-app:           #FFFFFF;  /* main app card, floats on canvas, large radius */
--bg-sidebar:       #FFFFFF;
--bg-subtle:        #F6F7FD;  /* input fields, inactive chips, soft panels */
--bg-promo:         #E3E5FA;  /* lavender promo/upsell card fill */

/* Brand */
--primary:          #5A60EA;  /* indigo — buttons, active nav, links, progress */
--primary-hover:    #4A50D8;
--primary-soft:     #EDEEFC;  /* selected/active item backgrounds */

/* Text */
--text-primary:     #1F2233;  /* near-black navy */
--text-secondary:   #8A8FA8;  /* muted gray-violet for meta, descriptions */
--text-on-primary:  #FFFFFF;

/* Lines & states */
--border:           #ECEDF5;
--border-dashed:    #C9CCF1;  /* dropzone / placeholder dashed borders */
--success:          #4CC38A;  /* completion ticks */
--danger:           #E5484D;
--overlay-scrim:    rgba(31,34,51,0.55);  /* pop-ad overlay behind card */

/* Upsell intensity (extends reference palette, stays in family) */
--upsell-1:         #F6F7FD;  /* soft tier — subtle panel */
--upsell-3:         #E3E5FA;  /* direct tier — lavender fill */
--upsell-5:         #5A60EA;  /* max tier — solid indigo, white text */
```

## 2. Typography

```css
--font-family: 'Inter', -apple-system, sans-serif;  /* geometric humanist sans, matches reference */

--text-h1:    24px/32px, 700;   /* page titles ("Product Analytics" scale) */
--text-h2:    18px/26px, 700;   /* section headers ("All Lessons") */
--text-h3:    15px/22px, 600;   /* card titles, lesson names */
--text-body:  14px/22px, 400;
--text-meta:  12px/16px, 400;   /* durations, captions — --text-secondary */
--text-btn:   14px/20px, 600;
```
Headings in --text-primary; never pure black. Sidebar nav labels 14px/500.

## 3. Shape & elevation

```css
--radius-app:    24px;  /* outer app container */
--radius-card:   16px;  /* cards, panels, video player frame */
--radius-input:  10px;  /* inputs, chips, small thumbs */
--radius-btn:    10px;
--radius-pill:   999px; /* progress bars, tags, duration chips */

--shadow-card:   0 4px 20px rgba(90,96,234,0.08);   /* barely-there, tinted indigo */
--shadow-float:  0 16px 40px rgba(31,34,51,0.10);   /* app container on canvas */
```
Elevation is whisper-soft. No hard shadows anywhere.

## 4. Spacing & layout

- Base unit 4px; common steps 8 / 12 / 16 / 24 / 32.
- App container: centered on --bg-canvas with ~40px margin, --radius-app, --shadow-float.
- 3-zone course layout: sidebar 240px · center fluid (max 760px) · right rail 300px, 24px gutters.
- Card padding 20–24px. Section vertical rhythm 32px.

## 5. Component recipes (match reference exactly)

**Sidebar nav item** — line icon (lucide, 20px, 1.5px stroke) + label. Active: --primary text + 3px rounded left indicator bar + --primary-soft pill background. Inactive: --text-secondary.

**Lesson thumbnail card** — rounded image (--radius-input), duration chip top-left (--overlay scrim, white 12px text, pill), circular play button top-right (white 70% bg, --primary icon). Title below in --text-h3.

**Video player frame** — --radius-card, title overlaid top-left in white 600 weight on subtle gradient scrim.

**Progress** — pill track in --bg-subtle, fill --primary, 6px height. Module steps: 28px numbered circle, 1.5px border; completed = --primary fill white check; current = --primary border + --primary text; upcoming = --border border + --text-secondary.

**Buttons** — Primary: --primary fill, white text, --radius-btn, 12px×20px padding. Secondary: white fill, 1.5px --primary border, --primary text. Ghost: --primary text only.

**Resource/material row** — white card, --border 1px, icon tile 48px (--bg-promo fill, --radius-input), title --text-h3, two-line clamped description --text-meta, circular download icon button right.

**Upsell panel (right rail)** — card per intensity: tier 1–2 --upsell-1 bg + secondary button; tier 3–4 --upsell-3 bg + primary button + social-proof meta line; tier 5 --upsell-5 bg, white text, white-on-indigo button, urgency meta line.

**Pop-ad overlay (O1)** — full-player --overlay-scrim, centered white card (--radius-card, max 480px): media slot 16:9 top, headline --text-h2, primary CTA full-width, "Skip in Ns" as --text-meta ghost link bottom-center turning into "Skip" after countdown.

**Inputs** — --bg-subtle fill, no border at rest, --radius-input, placeholder --text-secondary; focus: 1.5px --primary ring.

**Empty/dropzone states** — 1.5px dashed --border-dashed, --radius-card, centered line icon + meta text.

## 6. Vibe rules (non-negotiable)

1. Airy: white dominates inside the app; periwinkle only as canvas wash + soft fills.
2. One accent color. Indigo does ALL interactive work. Success green only on completion ticks.
3. Friendly geometry: everything rounded, nothing sharp, nothing skeuomorphic.
4. Line icons only (lucide), 1.5px stroke, never filled except active states.
5. Soft contrast hierarchy: navy headings, gray-violet meta — no pure black, no pure gray.
