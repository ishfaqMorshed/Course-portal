import { createClient } from "@/lib/supabase/server";
import type { EnrolledCourseRow } from "@/lib/supabase/database.types";
import type { AdRuleRow, UpsellRow } from "@/lib/admin/types";
import type { Course, Module, Resource } from "@/lib/types";

interface CourseTreeRow {
  module_id: string;
  module_sort: number;
  module_title: string;
  lesson_id: string;
  lesson_sort: number;
  lesson_title: string;
  vimeo_id: string | null;
  video_source: "vimeo" | "youtube" | "url";
  description: string | null;
  resources: Resource[] | null;
  thumbnail_url: string | null;
  pct: number;
  last_position: number;
  completed_at: string | null;
}

export interface CurrentUser {
  name: string;
  email: string;
  initials: string;
}

export interface EnrolledCourse {
  id: string;
  slug: string;
  title: string;
  thumbnailUrl: string | null;
  totalLessons: number;
  completedLessons: number;
  pct: number;
}

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

// Current authenticated user (name from auth metadata set by wh-purchase-47).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const name = (user.user_metadata?.full_name as string) || user.email || "Learner";
  return { name, email: user.email ?? "", initials: initialsFrom(name) || "?" };
}

// CONNECTION-MAP §1: get_enrolled_courses(user). Returns [] when not enrolled.
export async function getEnrolledCourses(): Promise<EnrolledCourse[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_enrolled_courses");
  if (error || !data) return [];
  return (data as EnrolledCourseRow[]).map((r) => ({
    id: r.course_id,
    slug: r.slug,
    title: r.title,
    thumbnailUrl: r.thumbnail_url ?? null,
    totalLessons: Number(r.total_lessons),
    completedLessons: Number(r.completed_lessons),
    pct: Number(r.pct),
  }));
}

// CONNECTION-MAP §1: get_course_tree(course). Live modules+lessons+progress,
// assembled into the portal's Module[] shape (Phase 2.7-fix). duration is not a
// DB column → blank until the Vimeo player reports it (Phase 3).
export async function getCourseTree(courseId: string): Promise<{ course: Course | null; modules: Module[] }> {
  const supabase = createClient();

  const { data: c } = await supabase
    .from("courses").select("id, slug, title, status, thumbnail_url").eq("id", courseId).maybeSingle();
  const course: Course | null = c
    ? { id: c.id, slug: c.slug, title: c.title, status: c.status, thumbnailUrl: c.thumbnail_url ?? null, subtitle: "", coverLabel: "", lastLessonId: "" }
    : null;

  const { data, error } = await supabase.rpc("get_course_tree", { p_course_id: courseId });
  if (error || !data) return { course, modules: [] };

  const byModule = new Map<string, Module>();
  for (const r of data as CourseTreeRow[]) {
    let mod = byModule.get(r.module_id);
    if (!mod) {
      mod = { id: r.module_id, course_id: courseId, sort: r.module_sort, title: r.module_title, lessons: [] };
      byModule.set(r.module_id, mod);
    }
    mod.lessons.push({
      id: r.lesson_id,
      module_id: r.module_id,
      sort: r.lesson_sort,
      title: r.lesson_title,
      vimeoId: r.vimeo_id,
      videoSource: r.video_source,
      description: r.description,
      resources: r.resources ?? [],
      thumbnailUrl: r.thumbnail_url ?? null,
      hasVideo: !!(r.vimeo_id && r.vimeo_id.trim()),
      duration: "",
      thumbLabel: "",
      progress: Number(r.pct),
      lastPosition: Number(r.last_position ?? 0),
      completed: r.completed_at != null,
    });
  }
  return { course, modules: Array.from(byModule.values()) };
}

// upsell_config rows for a course (RLS: enrolled OR admin). Resolved per-placement
// in the client via lib/portal-map.
export async function getUpsells(courseId: string): Promise<UpsellRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("upsell_config").select("*").eq("course_id", courseId);
  if (error || !data) return [];
  return data as UpsellRow[];
}

// ad_rules rows for a course (RLS: enrolled OR admin). Resolved per-lesson in the
// client via lib/portal-map (lesson > module > course precedence).
export async function getAdRules(courseId: string): Promise<AdRuleRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("ad_rules").select("*").eq("course_id", courseId);
  if (error || !data) return [];
  return data as AdRuleRow[];
}
