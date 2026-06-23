"use client";

// Phase 7 step 2 — read-only wrappers over the admin analytics RPCs (migration
// 0014). Every RPC is SECURITY DEFINER + is_admin()-gated server-side; these run
// through the authenticated browser session. Each throws on error.

import { createClient } from "@/lib/supabase/client";

function db() {
  return createClient();
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T;
}

export interface AdminKpis {
  total_students: number;
  total_enrollments: number;
  lesson_completions: number;
  course_completions: number;
}

export interface SegmentCount {
  segment: string;
  n: number;
}

export interface EngagementCount {
  type: string;
  placement: string | null;
  n: number;
}

export interface LessonCompletion {
  lesson_id: string;
  lesson_title: string;
  n: number;
}

export interface StudentRow {
  user_id: string;
  email: string;
  segment: string | null;
  completed_lessons: number;
  total_lessons: number;
  last_active: string | null;
  enrolled_at: string;
}

export interface StudentEvent {
  created_at: string;
  type: string;
  payload: Record<string, unknown>;
}

// admin_kpis() returns a single row.
export async function getKpis(): Promise<AdminKpis> {
  const { data, error } = await db().rpc("admin_kpis").single();
  if (error) throw new Error(error.message);
  return data as AdminKpis;
}

export async function getSegmentCounts(): Promise<SegmentCount[]> {
  return unwrap(await db().rpc("admin_segment_counts"));
}

export async function getEngagementCounts(): Promise<EngagementCount[]> {
  return unwrap(await db().rpc("admin_engagement_counts"));
}

export async function getLessonCompletions(): Promise<LessonCompletion[]> {
  return unwrap(await db().rpc("admin_lesson_completions"));
}

export async function getStudents(): Promise<StudentRow[]> {
  return unwrap(await db().rpc("admin_students"));
}

export async function getStudentEvents(userId: string): Promise<StudentEvent[]> {
  return unwrap(await db().rpc("admin_student_events", { p_user_id: userId }));
}

export const PRICE_PER_ENROLLMENT = 47; // $47 course (MASTER §1)
