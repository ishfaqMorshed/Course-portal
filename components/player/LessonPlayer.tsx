"use client";

// ============================================================
// LessonPlayer.tsx — Phase 3 tracking player wrapper (replaces VideoEmbed's
// role for video lessons). Switches on video_source to one of three provider
// adapters behind the {percent, seconds, duration} interface, then runs the
// provider-agnostic tracking engine:
//   • resume from last_position on load
//   • throttled (~10s) progress writes to lesson_progress
//   • first play  → onFirstPlay (parent emits `lesson_started`)
//   • pct ≥ 0.70  → onAutoComplete (parent runs complete_lesson + GHL push)
//   • onProgress(percent, seconds, duration) bubbled up for the ad engine
// Exposes imperative { play, pause, seekTo } so the ad overlay can pause/resume
// the underlying player regardless of provider.
// ============================================================

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { createAdapter } from "@/lib/player/factory";
import { flushProgress, lastKnownPosition, saveProgress } from "@/lib/progress";
import type { PlayerAdapter } from "@/lib/player/types";
import type { Lesson } from "@/lib/types";

const COMPLETE_AT = 0.7; // D1 (Phase 3 re-scope): auto-complete at 70% watched.

export interface LessonPlayerHandle {
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
}

interface LessonPlayerProps {
  lessonId: string;
  source?: Lesson["videoSource"];
  url: string; // generic video ref (lessons.vimeo_id)
  title?: string;
  initialPct: number; // 0..100 stored pct (seeds the monotonic session max)
  lastPosition: number; // seconds, resume point
  alreadyComplete: boolean; // suppress auto-complete on an already-done lesson
  onProgress?: (percent: number, seconds: number, duration: number) => void;
  onFirstPlay?: () => void;
  onAutoComplete?: () => void;
}

const LessonPlayer = forwardRef<LessonPlayerHandle, LessonPlayerProps>(function LessonPlayer(
  { lessonId, source, url, title, initialPct, lastPosition, alreadyComplete, onProgress, onFirstPlay, onAutoComplete },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const adapterRef = useRef<PlayerAdapter | null>(null);

  // Latest callbacks in refs so the adapter effect can depend only on the
  // lesson identity (no teardown/rebuild when a parent closure changes).
  const cbs = useRef({ onProgress, onFirstPlay, onAutoComplete });
  cbs.current = { onProgress, onFirstPlay, onAutoComplete };

  useImperativeHandle(ref, () => ({
    play: () => adapterRef.current?.play(),
    pause: () => adapterRef.current?.pause(),
    seekTo: (s: number) => adapterRef.current?.seekTo(s),
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;

    const adapter = createAdapter(source, { container, ref: url });
    adapterRef.current = adapter;

    let maxPct = Math.min(1, Math.max(0, (initialPct || 0) / 100)); // monotonic session max
    let autoFired = false;

    adapter.onFirstPlay(() => cbs.current.onFirstPlay?.());

    adapter.onProgress(({ percent, seconds, duration }) => {
      if (percent > maxPct) maxPct = percent;
      cbs.current.onProgress?.(percent, seconds, duration);
      saveProgress(lessonId, {
        seconds,
        pct: maxPct * 100,
        lastPosition: seconds,
        secondsWatched: maxPct * duration,
      });
      if (!autoFired && !alreadyComplete && maxPct >= COMPLETE_AT) {
        autoFired = true;
        cbs.current.onAutoComplete?.();
      }
    });

    // Resume from the furthest of the DB position (page load) and any in-session
    // position recorded since (revisiting a lesson without a reload).
    adapter.seekTo(Math.max(lastPosition, lastKnownPosition(lessonId) ?? 0));

    return () => {
      flushProgress(lessonId);
      adapter.destroy();
      adapterRef.current = null;
    };
    // Rebuild only when the lesson/source/ref changes. Callbacks live in refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, url, source]);

  return (
    // 16:9 box; the descendant rules force whatever the active adapter injects
    // (Vimeo/YouTube iframe or HTML5 <video>) to fill it edge-to-edge — robust to
    // each provider's own default width/height and to async iframe injection.
    <div
      ref={containerRef}
      title={title}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black
        [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full [&_iframe]:border-0
        [&_video]:absolute [&_video]:inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
    />
  );
});

export default LessonPlayer;
