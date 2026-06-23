// ============================================================
// vimeo.ts — Vimeo adapter (@vimeo/player). Native timeupdate carries
// {seconds, percent, duration}; setCurrentTime() handles resume.
// ============================================================

import Player from "@vimeo/player";
import { vimeoId } from "./provider";
import type { AdapterMount, PlayerAdapter, PlayerProgress } from "./types";

export function createVimeoAdapter({ container, ref }: AdapterMount): PlayerAdapter {
  const id = vimeoId(ref);
  // Numeric ID → mount by id; otherwise treat the ref as a full Vimeo URL.
  // (Cast: @vimeo/player's option types brand `url`, but it accepts a plain string.)
  const opts = /^\d+$/.test(id) ? { id: Number(id) } : { url: ref };
  const player = new Player(container, opts as ConstructorParameters<typeof Player>[1]);

  // Make the injected iframe fill the (relative aspect-video) container.
  const iframe = container.querySelector("iframe");
  if (iframe) {
    iframe.style.position = "absolute";
    iframe.style.inset = "0";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
  }

  let firstPlayCb: (() => void) | null = null;
  let firedFirstPlay = false;

  player.on("play", () => {
    if (!firedFirstPlay && firstPlayCb) {
      firedFirstPlay = true;
      firstPlayCb();
    }
  });

  return {
    onProgress(cb: (p: PlayerProgress) => void) {
      player.on("timeupdate", (d: { seconds: number; percent: number; duration: number }) => {
        cb({ percent: d.percent ?? 0, seconds: d.seconds ?? 0, duration: d.duration ?? 0 });
      });
    },
    onFirstPlay(cb: () => void) {
      firstPlayCb = cb;
    },
    seekTo(seconds: number) {
      if (seconds <= 1) return;
      player.ready().then(() => player.setCurrentTime(seconds)).catch(() => {});
    },
    play() {
      player.play().catch(() => {});
    },
    pause() {
      player.pause().catch(() => {});
    },
    destroy() {
      player.destroy().catch(() => {});
    },
  };
}
