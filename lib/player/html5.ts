// ============================================================
// html5.ts — Direct-URL adapter (HTML5 <video>). Native timeupdate carries
// currentTime/duration; currentTime= handles resume (after metadata loads).
// ============================================================

import type { AdapterMount, PlayerAdapter, PlayerProgress } from "./types";

export function createHtml5Adapter({ container, ref }: AdapterMount): PlayerAdapter {
  const video = document.createElement("video");
  video.src = ref;
  video.controls = true;
  video.playsInline = true;
  video.className = "absolute inset-0 w-full h-full bg-black";
  container.appendChild(video);

  let firstPlayCb: (() => void) | null = null;
  let firedFirstPlay = false;
  let pendingSeek = 0;

  video.addEventListener("play", () => {
    if (!firedFirstPlay && firstPlayCb) {
      firedFirstPlay = true;
      firstPlayCb();
    }
  });
  // Apply a deferred resume once we know the duration.
  video.addEventListener("loadedmetadata", () => {
    if (pendingSeek > 1) {
      video.currentTime = pendingSeek;
      pendingSeek = 0;
    }
  });

  return {
    onProgress(cb: (p: PlayerProgress) => void) {
      video.addEventListener("timeupdate", () => {
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        const seconds = video.currentTime || 0;
        const percent = duration > 0 ? Math.min(1, seconds / duration) : 0;
        cb({ percent, seconds, duration });
      });
    },
    onFirstPlay(cb: () => void) {
      firstPlayCb = cb;
    },
    seekTo(seconds: number) {
      if (seconds <= 1) return;
      if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = seconds;
      else pendingSeek = seconds; // applied on loadedmetadata
    },
    play() {
      video.play().catch(() => {});
    },
    pause() {
      video.pause();
    },
    destroy() {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
    },
  };
}
