// ============================================================
// fixtures.ts — all mock data for the Course Portal prototype.
// Replaces the export's window.FIXTURES. Typed to MASTER.md §3 entities
// (see lib/types.ts). No backend, no real Vimeo (Phase 1.5).
//
// Phase 2/3 swaps this for real queries (CONNECTION-MAP §1). Canonical columns
// (module_id, sort, vimeoId, slug, status, placement, ...) are populated so the
// shapes already match; runtime-only fields are tagged in lib/types.ts.
// ============================================================

import type { Fixtures } from "./types";

export const FIXTURES: Fixtures = {
  user: {
    name: "Sam Carter",
    email: "sam@demo.com",
    initials: "SC",
  },

  // ---- Sidebar promo card (upsell_config placement='sidebar_promo') --------
  sidebarPromo: {
    illustrationLabel: "promo art",
    line1: "Go further with the",
    line2: "AI Profit Accelerator",
    cta: "Get Access",
    url: "https://example.com/accelerator",
  },

  // ---- S2: enrolled courses ------------------------------------------------
  courses: [
    {
      id: "aps",
      slug: "ai-profit-systems",
      title: "AI Profit Systems",
      status: "published",
      subtitle: "Build automated income streams with AI workflows",
      coverLabel: "course cover",
      lastLessonId: "m2l2", // "Continue" deep-link target
    },
  ],

  // ---- S3: curriculum ------------------------------------------------------
  // progress: 100 = completed, 1–99 = in-progress, 0 = untouched (runtime-only)
  modules: [
    {
      id: "m1",
      course_id: "aps",
      sort: 1,
      title: "Foundations",
      lessons: [
        { id: "m1l1", module_id: "m1", sort: 1, title: "Welcome & How This Works", description: null, vimeoId: "vimeo-m1l1", thumbLabel: "intro thumb",   duration: "6 min",  hasVideo: true,  progress: 100, resources: [] },
        { id: "m1l2", module_id: "m1", sort: 2, title: "The AI Profit Mindset",    description: null, vimeoId: "vimeo-m1l2", thumbLabel: "mindset thumb", duration: "14 min", hasVideo: true,  progress: 100, resources: [] },
        { id: "m1l3", module_id: "m1", sort: 3, title: "Setting Up Your Toolkit",  description: null, vimeoId: "vimeo-m1l3", thumbLabel: "toolkit thumb", duration: "18 min", hasVideo: true,  progress: 100,
          resources: [
            { id: "r1", name: "Toolkit Checklist.pdf", size: "1.2 MB", kind: "pdf" },
            { id: "r2", name: "Starter Prompts.txt",   size: "8 KB",   kind: "txt" },
          ] },
      ],
    },
    {
      id: "m2",
      course_id: "aps",
      sort: 2,
      title: "Finding Your Niche",
      lessons: [
        { id: "m2l1", module_id: "m2", sort: 1, title: "Market Research with AI",   description: null, vimeoId: "vimeo-m2l1", thumbLabel: "research thumb", duration: "21 min", hasVideo: true,  progress: 100, resources: [] },
        { id: "m2l2", module_id: "m2", sort: 2, title: "Validating Demand Fast",    description: null, vimeoId: "vimeo-m2l2", thumbLabel: "demand thumb",   duration: "17 min", hasVideo: true,  progress: 40,  resources: [] },
        { id: "m2l3", module_id: "m2", sort: 3, title: "Choosing Your First Offer", description: null, vimeoId: "vimeo-m2l3", thumbLabel: "offer thumb",    duration: "12 min", hasVideo: true,  progress: 0,   resources: [] },
        { id: "m2l4", module_id: "m2", sort: 4, title: "Niche Worksheet",           description: null, vimeoId: null,         thumbLabel: "worksheet",     duration: "Read",   hasVideo: false, progress: 0,
          resources: [
            { id: "r3", name: "Niche Worksheet.pdf", size: "640 KB", kind: "pdf" },
          ] },
      ],
    },
    {
      id: "m3",
      course_id: "aps",
      sort: 3,
      title: "Building the System",
      lessons: [
        { id: "m3l1", module_id: "m3", sort: 1, title: "Your Automation Stack", description: null, vimeoId: "vimeo-m3l1", thumbLabel: "stack thumb",    duration: "24 min", hasVideo: true, progress: 0, resources: [] },
        { id: "m3l2", module_id: "m3", sort: 2, title: "Content Pipelines",     description: null, vimeoId: "vimeo-m3l2", thumbLabel: "pipeline thumb", duration: "19 min", hasVideo: true, progress: 0, resources: [] },
        { id: "m3l3", module_id: "m3", sort: 3, title: "Pricing & Packaging",   description: null, vimeoId: "vimeo-m3l3", thumbLabel: "pricing thumb",  duration: "15 min", hasVideo: true, progress: 0, resources: [] },
      ],
    },
    {
      id: "m4",
      course_id: "aps",
      sort: 4,
      title: "Launch & Scale",
      lessons: [
        { id: "m4l1", module_id: "m4", sort: 1, title: "Your First 10 Customers", description: null, vimeoId: "vimeo-m4l1", thumbLabel: "customers thumb", duration: "22 min", hasVideo: true, progress: 0, resources: [] },
        { id: "m4l2", module_id: "m4", sort: 2, title: "Scaling Without Burnout", description: null, vimeoId: "vimeo-m4l2", thumbLabel: "scaling thumb",   duration: "16 min", hasVideo: true, progress: 0, resources: [] },
        { id: "m4l3", module_id: "m4", sort: 3, title: "What's Next After Launch", description: null, vimeoId: "vimeo-m4l3", thumbLabel: "next thumb",     duration: "9 min",  hasVideo: true, progress: 0, resources: [] },
      ],
    },
  ],

  lessonDescriptions: {
    default:
      "In this lesson we walk through the exact process step by step, with real examples you can copy. Watch to the end — the last section ties everything together.",
  },

  // ---- Right rail: upsell config per module --------------------------------
  // intensity 1–2 soft · 3–4 direct · 5 completion pitch
  upsellConfig: {
    m1: {
      intensity: 1,
      placement: "rail",
      headline: "There's a faster way to do all this",
      body: "Students inside the Accelerator skip 6 weeks of setup with done-for-you templates and weekly calls.",
      cta: "See how it works",
      url: "https://example.com/accelerator",
      socialProof: null,
      urgency: null,
    },
    m2: {
      intensity: 2,
      placement: "rail",
      headline: "Stuck picking a niche?",
      body: "Accelerator members get their niche reviewed by a coach within 48 hours — no second-guessing.",
      cta: "Learn about coaching",
      url: "https://example.com/accelerator",
      socialProof: null,
      urgency: null,
    },
    m3: {
      intensity: 4,
      placement: "rail",
      headline: "Don't build this alone",
      body: "The Accelerator gives you the full automation stack pre-built, plus a coach reviewing your funnel every week.",
      cta: "Join the Accelerator — $497",
      url: "https://example.com/accelerator",
      socialProof: "612 students enrolled · 4.9 average rating",
      urgency: null,
    },
    m5_complete: {
      intensity: 5,
      placement: "completion",
      headline: "You finished. Now go 10× faster.",
      body: "You have the system — the Accelerator gives you the shortcuts: templates, weekly coaching, and a private community shipping alongside you.",
      cta: "Claim your spot — $497",
      url: "https://example.com/accelerator",
      socialProof: "612 students enrolled · 4.9 average rating",
      urgency: "Founding-member pricing ends this Friday",
    },
  },
  // m4 (final module) also uses max intensity per brief
  upsellModuleMap: { m1: "m1", m2: "m2", m3: "m3", m4: "m5_complete" },

  // ---- O1: in-video pop ad rule --------------------------------------------
  adRule: {
    triggerAtPct: 50, // fires at 50% of any video
    skippableAfterS: 5,
    headline: "Tired of doing this manually?",
    ctaLabel: "Watch the free demo",
    ctaUrl: "https://example.com/demo",
    assetLabel: "ad creative 16:9",
  },

  // ---- S1: login demo behavior (runtime-only) ------------------------------
  login: {
    enrolledEmails: ["sam@demo.com", "demo@enrolled.com"],
    // any other email → "not enrolled" error state
  },
};
