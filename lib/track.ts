// ============================================================
// track.ts — the ONE client event helper (CONNECTION-MAP §2).
// Inserts an append-only row into `events` (RLS: a user may insert only their
// own rows). Segments are derived from these server-side (Postgres trigger /
// daily job, Phase 4) — never computed in the client.
//
// Phase 3 emitters: login · lesson_started · ad_view · ad_skip · ad_click.
// (upsell_view / upsell_click are wired in Phase 5.)
// ============================================================

import { createClient } from "@/lib/supabase/client";

export type TrackType =
  | "login"
  | "lesson_started"
  | "ad_view"
  | "ad_skip"
  | "ad_click";

export async function track(
  type: TrackType,
  payload: Record<string, unknown> = {},
  courseId: string | null = null,
): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("events").insert({
    user_id: user.id,
    course_id: courseId,
    type,
    payload,
  });
}
