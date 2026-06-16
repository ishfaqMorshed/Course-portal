// ============================================================
// types.ts — fixture types for the Course Portal (Phase 1.5).
//
// Each interface is named for and shaped after a MASTER.md §3 entity.
// Canonical columns appear first; presentation/in-memory state is grouped
// under a "runtime-only" block and tagged on every field.
//
// IMPORTANT (Phase 2/3): fields marked `runtime-only, not a DB column` are
// prototype state ONLY. Do NOT treat them as schema columns. In particular,
// `progress` is in-memory here and will come from lesson_progress.pct later
// (CONNECTION-MAP §1: get_course_tree / lesson_progress).
// ============================================================

export type LessonId = string;
export type ProgressMap = Record<LessonId, number>;

// lessons.resources JSONB (MASTER.md §3)
export interface Resource {
  id: string;
  name: string;
  size: string;
  kind: string; // "pdf" | "txt" | ...
}

// lessons(id, module_id, sort, title, vimeo_id NULLABLE, description, resources JSONB)
export interface Lesson {
  id: LessonId;
  module_id: string;
  sort: number;
  title: string;
  vimeoId: string | null; // vimeo_id — null = no-video lesson (D1: manual "Mark complete")
  description: string | null;
  resources: Resource[];

  // ---- runtime-only, not a DB column ----
  hasVideo: boolean; // runtime-only, not a DB column (derived: vimeoId != null)
  duration: string; // runtime-only, not a DB column (presentation label, e.g. "14 min" / "Read")
  thumbLabel: string; // runtime-only, not a DB column (placeholder art label)
  progress: number; // runtime-only, not a DB column (comes from lesson_progress.pct in Phase 3)
}

// modules(id, course_id, sort, title)
export interface Module {
  id: string;
  course_id: string;
  sort: number;
  title: string;
  lessons: Lesson[]; // denormalized for rendering; canonically lessons reference module_id
}

// courses(id, slug, title, status)
export interface Course {
  id: string;
  slug: string;
  title: string;
  status: string; // "draft" | "published" | ...

  // ---- runtime-only, not a DB column ----
  subtitle: string; // runtime-only, not a DB column (presentation)
  coverLabel: string; // runtime-only, not a DB column (placeholder art label)
  lastLessonId: LessonId; // runtime-only, not a DB column ("Continue" target; Phase 2: get_resume_target)
}

// upsell_config(id, course_id, module_id, placement, headline, body, cta_label, cta_url, intensity)
export interface UpsellConfig {
  intensity: number; // 1..5
  headline: string;
  body: string;
  cta: string; // -> cta_label
  url: string; // -> cta_url
  placement: "rail" | "sidebar_promo" | "completion";
  socialProof: string | null;
  urgency: string | null;
}

// ad_rules(id, course_id, scope, trigger_type, trigger_value, skippable_after_s, asset_url, cta_url, active)
export interface AdRule {
  triggerAtPct: number; // trigger_type='pct', trigger_value
  skippableAfterS: number; // skippable_after_s
  ctaUrl: string; // cta_url

  // ---- runtime-only, not a DB column ----
  headline: string; // runtime-only, not a DB column (ad creative copy)
  ctaLabel: string; // runtime-only, not a DB column (ad creative copy)
  assetLabel: string; // runtime-only, not a DB column (placeholder art label; asset_url later)
}

// auth.users + profiles(user_id, ghl_contact_id, email)
export interface User {
  name: string;
  email: string;

  // ---- runtime-only, not a DB column ----
  initials: string; // runtime-only, not a DB column (derived for the avatar)
}

// upsell_config row, placement='sidebar_promo' (global; module_id NULL)
export interface SidebarPromo {
  line1: string;
  line2: string;
  cta: string;
  url: string;

  // ---- runtime-only, not a DB column ----
  illustrationLabel: string; // runtime-only, not a DB column (placeholder art label)
}

// ---- runtime-only, not a DB entity ----
// Prototype login demo behaviour. Real auth = Supabase magic link (Phase 2,
// CONNECTION-MAP §1: supabase.auth.signInWithOtp).
export interface LoginDemoConfig {
  enrolledEmails: string[];
}

export interface Fixtures {
  user: User;
  sidebarPromo: SidebarPromo;
  courses: Course[];
  modules: Module[];
  lessonDescriptions: { default: string };
  upsellConfig: Record<string, UpsellConfig>;
  upsellModuleMap: Record<string, string>;
  adRule: AdRule;
  login: LoginDemoConfig;
}
