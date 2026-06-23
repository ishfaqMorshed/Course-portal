"use client";

// Simple player — renders the right embed and just plays (no progress tracking;
// that's Phase 3). Provider resolution is ref-signal-first (unambiguous), then
// the admin's chosen video_source as a fallback. This is robust to bare IDs and
// to rows whose video_source wasn't set.

import type { Lesson } from "@/lib/types";

type Provider = "vimeo" | "youtube" | "url";

function resolveProvider(source: Lesson["videoSource"] | undefined, ref: string): Provider {
  const s = ref.trim();
  // Unambiguous signals from the stored ref win:
  if (/youtube\.com|youtu\.be/i.test(s)) return "youtube";
  if (/vimeo\.com/i.test(s)) return "vimeo";
  if (/^\d+$/.test(s)) return "vimeo"; // pure numeric ID = Vimeo
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return "youtube"; // 11-char ID = YouTube
  // Otherwise trust the admin's chosen source (e.g. a direct .mp4 URL).
  if (source === "vimeo" || source === "youtube" || source === "url") return source;
  return "url";
}

function vimeoId(s: string): string {
  const m = s.match(/vimeo\.com\/(?:video\/)?(\d+)/i) ?? s.match(/(\d{6,})/);
  return m ? m[1] : s;
}

function youtubeId(s: string): string {
  const m =
    s.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/i) ??
    s.match(/^([A-Za-z0-9_-]{11})$/);
  return m ? m[1] : s;
}

export default function VideoEmbed({ source, url, title }: { source?: Lesson["videoSource"]; url: string; title?: string }) {
  const u = (url ?? "").trim();
  const provider = resolveProvider(source, u);

  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-black">
      {provider === "vimeo" ? (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoId(u)}`}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      ) : provider === "youtube" ? (
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId(u)}`}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <video src={u} controls className="absolute inset-0 w-full h-full bg-black" />
      )}
    </div>
  );
}
