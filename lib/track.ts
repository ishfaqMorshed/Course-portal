// ============================================================
// track.ts — the ONE client event helper (CONNECTION-MAP §2).
// Inserts an append-only row into `events` (RLS: a user may insert only their
// own rows). Segments are derived from these server-side (Postgres trigger /
// daily job, Phase 4) — never computed in the client.
//
// Phase 3 emitters: login · lesson_started · ad_view · ad_skip · ad_click.
// Phase 5 emitters: upsell_view · upsell_click (upsell panel engagement).
// ============================================================

import { createClient } from "@/lib/supabase/client";

export type TrackType =
  | "login"
  | "lesson_started"
  | "ad_view"
  | "ad_skip"
  | "ad_click"
  | "upsell_view"
  | "upsell_click";

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

// Phase 5 — upsell_view dedup. A panel can mount many times in one SPA session
// (screen switches, remounts, desktop + mobile sidebars), but we want ONE
// upsell_view per panel-shown per session. A module-level Set persists across
// React remounts and resets on a full page reload (= a new session), which is
// exactly "once per session". Key by `${placement}:${upsellId}` — rail rows are
// per-module, so each module/placement gets its own key.
const seenUpsellViews = new Set<string>();

export async function trackUpsellViewOnce(
  key: string,
  payload: Record<string, unknown> = {},
  courseId: string | null = null,
): Promise<void> {
  if (seenUpsellViews.has(key)) return;
  seenUpsellViews.add(key);
  await track("upsell_view", payload, courseId);
}
