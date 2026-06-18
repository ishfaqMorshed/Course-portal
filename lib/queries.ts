import { createClient } from "@/lib/supabase/server";
import type { EnrolledCourseRow } from "@/lib/supabase/database.types";

export interface CurrentUser {
  name: string;
  email: string;
  initials: string;
}

export interface EnrolledCourse {
  id: string;
  slug: string;
  title: string;
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
    totalLessons: Number(r.total_lessons),
    completedLessons: Number(r.completed_lessons),
    pct: Number(r.pct),
  }));
}
