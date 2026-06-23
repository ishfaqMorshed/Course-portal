// ============================================================
// provider.ts — shared video-provider detection + ref parsing.
// Extracted from the Phase 2.7 VideoEmbed so the LessonPlayer wrapper and the
// three adapters resolve provider identically. Resolution is ref-signal-first
// (unambiguous), then the admin's chosen video_source as a fallback — robust to
// bare IDs and to rows whose video_source wasn't set.
// ============================================================

import type { Lesson } from "@/lib/types";

export type Provider = "vimeo" | "youtube" | "url";

export function resolveProvider(source: Lesson["videoSource"] | undefined, ref: string): Provider {
  const s = (ref ?? "").trim();
  // Unambiguous signals from the stored ref win:
  if (/youtube\.com|youtu\.be/i.test(s)) return "youtube";
  if (/vimeo\.com/i.test(s)) return "vimeo";
  if (/^\d+$/.test(s)) return "vimeo"; // pure numeric ID = Vimeo
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return "youtube"; // 11-char ID = YouTube
  // Otherwise trust the admin's chosen source (e.g. a direct .mp4 URL).
  if (source === "vimeo" || source === "youtube" || source === "url") return source;
  return "url";
}

export function vimeoId(s: string): string {
  const t = (s ?? "").trim();
  const m = t.match(/vimeo\.com\/(?:video\/)?(\d+)/i) ?? t.match(/(\d{6,})/);
  return m ? m[1] : t;
}

export function youtubeId(s: string): string {
  const t = (s ?? "").trim();
  const m =
    t.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/i) ??
    t.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : t;
}
