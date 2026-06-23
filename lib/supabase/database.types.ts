// Minimal hand-written row types for the tables wired in Phase 2.
// (Full generated types can replace this later via `supabase gen types`.)

export interface EnrolledCourseRow {
  course_id: string;
  slug: string;
  title: string;
  thumbnail_url: string | null;
  total_lessons: number;
  completed_lessons: number;
  pct: number;
}
