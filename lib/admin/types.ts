// Phase 2.7 admin — DB row shapes (canonical columns; no runtime-only fields).
// These mirror MASTER §3 table definitions exactly.

export interface CourseRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
}

export interface ModuleRow {
  id: string;
  course_id: string;
  sort: number;
  title: string;
}

// lessons.resources JSONB entries — Phase 2.7 shape: name / url / kind
// (kind drives the portal's ResourceRow icon).
export interface LessonResource {
  name: string;
  url: string;
  kind: string; // "pdf" | "txt" | "zip" | "link" | ...
}

export type VideoSource = "vimeo" | "youtube" | "url";

export interface LessonRow {
  id: string;
  module_id: string;
  sort: number;
  title: string;
  // Reused as the generic video reference (0009): holds a Vimeo ID, a YouTube ID,
  // or a direct video URL depending on video_source. null/"" = no-video lesson.
  vimeo_id: string | null;
  video_source: VideoSource;
  description: string | null;
  resources: LessonResource[];
}

export type Placement = "rail" | "sidebar_promo" | "completion";

export interface UpsellRow {
  id: string;
  course_id: string;
  module_id: string | null; // null = global (sidebar_promo)
  placement: Placement;
  headline: string;
  body: string;
  cta_label: string;
  cta_url: string;
  intensity: number; // 1..5
  image_url: string | null; // promo art URL (0007)
}

export type AdScope = "course" | "module" | "lesson";
export type TriggerType = "pct" | "timestamp_s";

export interface AdRuleRow {
  id: string;
  course_id: string;
  scope: AdScope;
  module_id: string | null; // set when scope='module'
  lesson_id: string | null; // set when scope='lesson'
  trigger_type: TriggerType;
  trigger_value: number;
  skippable_after_s: number;
  asset_url: string | null; // ad image URL
  cta_url: string | null;
  active: boolean;
  headline: string | null; // ad overlay copy (0007)
  cta_label: string | null; // ad overlay copy (0007)
}

export interface SegmentConfigRow {
  course_id: string;
  stalled_after_days: number;
  never_activated_after_days: number;
}
