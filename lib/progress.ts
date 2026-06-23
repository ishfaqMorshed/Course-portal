// ============================================================
// progress.ts — Phase 3 progress writes + completion (client).
//
// saveProgress(): throttled (~10s) upsert to lesson_progress so resume +
//   watch-time survive reloads without hammering the DB on every timeupdate.
//   flushProgress() forces the pending write (on pause / lesson switch / unmount).
// completeLesson(): the complete_lesson RPC (idempotent; sets completed_at,
//   writes lesson_completed / course_completed events). pushLessonEvent() fires
//   the GHL webhook edge fn — call it ONLY when completeLesson reports a NEW
//   completion (first idempotency gate; the edge fn is the second).
// ============================================================

import { createClient } from "@/lib/supabase/client";

const THROTTLE_MS = 10_000;

export interface ProgressSample {
  seconds: number; // current playback position
  pct: number; // 0..100, monotonic max for the session
  lastPosition: number; // resume point (seconds)
  secondsWatched: number; // furthest-watched seconds (feeds watch-time)
}

interface Slot {
  lastSentAt: number;
  pending: ProgressSample | null;
  timer: ReturnType<typeof setTimeout> | null;
}

// Per-lesson throttle state (module-level so it persists across renders).
const slots = new Map<string, Slot>();

// Latest known playback position per lesson THIS session (module-level so a
// lesson revisited without a reload resumes where it actually left off, ahead of
// the stale DB last_position the page loaded with). No localStorage (CLAUDE rule).
const positions = new Map<string, number>();

export function lastKnownPosition(lessonId: string): number | undefined {
  return positions.get(lessonId);
}

async function upsert(lessonId: string, s: ProgressSample): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      seconds_watched: Math.round(Math.max(0, s.secondsWatched)),
      pct: Math.min(100, Math.max(0, s.pct)),
      last_position: Math.round(Math.max(0, s.lastPosition)),
    },
    { onConflict: "user_id,lesson_id" },
  );
}

// Throttled upsert: sends immediately if the window has elapsed, otherwise keeps
// the latest sample and schedules a trailing flush so nothing is lost.
export function saveProgress(lessonId: string, sample: ProgressSample): void {
  const now = Date.now();
  positions.set(lessonId, sample.lastPosition); // updated every tick (cheap, no I/O)
  const slot = slots.get(lessonId) ?? { lastSentAt: 0, pending: null, timer: null };
  slot.pending = sample;
  slots.set(lessonId, slot);

  if (now - slot.lastSentAt >= THROTTLE_MS) {
    slot.lastSentAt = now;
    const toSend = slot.pending;
    slot.pending = null;
    void upsert(lessonId, toSend);
  } else if (!slot.timer) {
    const wait = THROTTLE_MS - (now - slot.lastSentAt);
    slot.timer = setTimeout(() => {
      slot.timer = null;
      flushProgress(lessonId);
    }, wait);
  }
}

// Force-send the latest pending sample now (pause / lesson switch / unmount).
export function flushProgress(lessonId: string): void {
  const slot = slots.get(lessonId);
  if (!slot) return;
  if (slot.timer) {
    clearTimeout(slot.timer);
    slot.timer = null;
  }
  if (slot.pending) {
    slot.lastSentAt = Date.now();
    const toSend = slot.pending;
    slot.pending = null;
    void upsert(lessonId, toSend);
  }
}

export interface CompleteResult {
  newlyCompleted: boolean;
  courseCompleted: boolean;
}

// Idempotent completion via the RPC. Returns whether THIS call newly completed
// the lesson (drives the GHL push) and whether the course is now complete.
export async function completeLesson(lessonId: string): Promise<CompleteResult> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("complete_lesson", { p_lesson_id: lessonId });
  if (error || !data) return { newlyCompleted: false, courseCompleted: false };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    newlyCompleted: !!row?.newly_completed,
    courseCompleted: !!row?.course_completed,
  };
}

// Fire the per-lesson GHL event (edge fn writes ghl_sync_log + is itself
// idempotent). Best-effort: failures are logged server-side, never block the UI.
export async function pushLessonEvent(lessonId: string): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.functions.invoke("push-lesson-event", { body: { lesson_id: lessonId } });
  } catch {
    /* edge fn records the failure in ghl_sync_log; UI stays unblocked */
  }
}
