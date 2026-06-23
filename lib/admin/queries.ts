"use client";

// Phase 2.7 admin CRUD — all calls go through the authenticated browser session;
// the 0005 admin RLS policies (public.is_admin()) gate every write server-side.
// Each helper throws on error so the calling form can surface a message.

import { createClient } from "@/lib/supabase/client";
import type {
  AdRuleRow,
  CourseRow,
  LessonRow,
  ModuleRow,
  SegmentConfigRow,
  UpsellRow,
} from "@/lib/admin/types";

function db() {
  return createClient();
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// Delete + verify a row actually came back. Under RLS denial PostgREST returns
// success with 0 rows and no error — without this check that reads as a silent
// success. .select() forces the deleted rows to be returned so we can assert ≥1.
async function deleteChecked(table: string, id: string): Promise<void> {
  const { data, error } = await db().from(table).delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) {
    throw new Error("Delete affected 0 rows — not permitted, or the row no longer exists.");
  }
}

// ---------- courses ----------------------------------------------------------
export async function listCourses(): Promise<CourseRow[]> {
  return unwrap(await db().from("courses").select("*").order("title"));
}
export async function getCourse(id: string): Promise<CourseRow | null> {
  const { data, error } = await db().from("courses").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function createCourse(input: Pick<CourseRow, "slug" | "title" | "status">): Promise<CourseRow> {
  return unwrap(await db().from("courses").insert(input).select().single());
}
export async function updateCourse(id: string, patch: Partial<CourseRow>): Promise<CourseRow> {
  return unwrap(await db().from("courses").update(patch).eq("id", id).select().single());
}

// ---------- modules ----------------------------------------------------------
export async function listModules(courseId: string): Promise<ModuleRow[]> {
  return unwrap(await db().from("modules").select("*").eq("course_id", courseId).order("sort"));
}
export async function createModule(input: Pick<ModuleRow, "course_id" | "sort" | "title">): Promise<ModuleRow> {
  return unwrap(await db().from("modules").insert(input).select().single());
}
export async function updateModule(id: string, patch: Partial<ModuleRow>): Promise<ModuleRow> {
  return unwrap(await db().from("modules").update(patch).eq("id", id).select().single());
}
export async function deleteModule(id: string): Promise<void> {
  await deleteChecked("modules", id);
}

// ---------- lessons ----------------------------------------------------------
export async function listLessons(moduleId: string): Promise<LessonRow[]> {
  return unwrap(await db().from("lessons").select("*").eq("module_id", moduleId).order("sort"));
}
export async function createLesson(
  input: Pick<LessonRow, "module_id" | "sort" | "title" | "vimeo_id" | "description" | "resources">,
): Promise<LessonRow> {
  return unwrap(await db().from("lessons").insert(input).select().single());
}
export async function updateLesson(id: string, patch: Partial<LessonRow>): Promise<LessonRow> {
  return unwrap(await db().from("lessons").update(patch).eq("id", id).select().single());
}
export async function deleteLesson(id: string): Promise<void> {
  await deleteChecked("lessons", id);
}

// Swap the `sort` of two rows (up/down reorder) in one table.
export async function swapSort(
  table: "modules" | "lessons",
  a: { id: string; sort: number },
  b: { id: string; sort: number },
): Promise<void> {
  const client = db();
  // two-step to dodge a transient unique collision if a uniqueness rule is added later
  const e1 = (await client.from(table).update({ sort: b.sort }).eq("id", a.id)).error;
  if (e1) throw new Error(e1.message);
  const e2 = (await client.from(table).update({ sort: a.sort }).eq("id", b.id)).error;
  if (e2) throw new Error(e2.message);
}

// ---------- upsell_config ----------------------------------------------------
export async function listUpsells(courseId: string): Promise<UpsellRow[]> {
  return unwrap(
    await db().from("upsell_config").select("*").eq("course_id", courseId).order("placement"),
  );
}
export async function createUpsell(
  input: Omit<UpsellRow, "id">,
): Promise<UpsellRow> {
  return unwrap(await db().from("upsell_config").insert(input).select().single());
}
export async function updateUpsell(id: string, patch: Partial<UpsellRow>): Promise<UpsellRow> {
  return unwrap(await db().from("upsell_config").update(patch).eq("id", id).select().single());
}
export async function deleteUpsell(id: string): Promise<void> {
  await deleteChecked("upsell_config", id);
}

// ---------- ad_rules ---------------------------------------------------------
export async function listAdRules(courseId: string): Promise<AdRuleRow[]> {
  return unwrap(await db().from("ad_rules").select("*").eq("course_id", courseId).order("scope"));
}
export async function createAdRule(input: Omit<AdRuleRow, "id">): Promise<AdRuleRow> {
  return unwrap(await db().from("ad_rules").insert(input).select().single());
}
export async function updateAdRule(id: string, patch: Partial<AdRuleRow>): Promise<AdRuleRow> {
  return unwrap(await db().from("ad_rules").update(patch).eq("id", id).select().single());
}
export async function deleteAdRule(id: string): Promise<void> {
  await deleteChecked("ad_rules", id);
}

// ---------- segment_config ---------------------------------------------------
export async function getSegmentConfig(courseId: string): Promise<SegmentConfigRow | null> {
  const { data, error } = await db()
    .from("segment_config")
    .select("*")
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
export async function upsertSegmentConfig(input: SegmentConfigRow): Promise<SegmentConfigRow> {
  return unwrap(
    await db().from("segment_config").upsert(input, { onConflict: "course_id" }).select().single(),
  );
}
