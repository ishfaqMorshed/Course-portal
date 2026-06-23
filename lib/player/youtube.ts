// ============================================================
// youtube.ts — YouTube adapter (IFrame Player API). The API has no native
// timeupdate, so we POLL getCurrentTime()/getDuration() on an interval.
// The API script is injected once and shared via a module-level promise.
// ============================================================

import { youtubeId } from "./provider";
import type { AdapterMount, PlayerAdapter, PlayerProgress } from "./types";

declare global {
  interface Window {
    YT?: typeof YT;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const POLL_MS = 500;
let apiPromise: Promise<typeof YT> | null = null;

// Load (once) the IFrame API and resolve when YT.Player is constructable.
function loadYouTubeApi(): Promise<typeof YT> {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<typeof YT>((resolve) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    // Chain onto any prior handler so a second loader never clobbers the first.
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT as typeof YT);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
  return apiPromise;
}

export function createYouTubeAdapter({ container, ref }: AdapterMount): PlayerAdapter {
  const videoId = youtubeId(ref);

  let player: YT.Player | null = null;
  let poller: ReturnType<typeof setInterval> | null = null;
  let destroyed = false;

  let progressCb: ((p: PlayerProgress) => void) | null = null;
  let firstPlayCb: (() => void) | null = null;
  let firedFirstPlay = false;
  let pendingSeek = 0; // applied once the player is ready

  // YT.Player replaces its target element with an iframe — give it a dedicated
  // child so the wrapper's container stays stable across remounts.
  const host = document.createElement("div");
  host.className = "absolute inset-0 w-full h-full";
  container.appendChild(host);

  loadYouTubeApi().then((YTApi) => {
    if (destroyed) return;
    player = new YTApi.Player(host, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      events: {
        onReady: () => {
          const frame = player?.getIframe?.();
          if (frame) {
            frame.style.position = "absolute";
            frame.style.inset = "0";
            frame.style.width = "100%";
            frame.style.height = "100%";
          }
          if (pendingSeek > 1 && player) player.seekTo(pendingSeek, true);
          poller = setInterval(() => {
            if (!player || !progressCb) return;
            const seconds = player.getCurrentTime?.() ?? 0;
            const duration = player.getDuration?.() ?? 0;
            const percent = duration > 0 ? Math.min(1, seconds / duration) : 0;
            progressCb({ percent, seconds, duration });
          }, POLL_MS);
        },
        onStateChange: (e: YT.OnStateChangeEvent) => {
          // YT.PlayerState.PLAYING === 1
          if (e.data === 1 && !firedFirstPlay && firstPlayCb) {
            firedFirstPlay = true;
            firstPlayCb();
          }
        },
      },
    });
  });

  return {
    onProgress(cb: (p: PlayerProgress) => void) {
      progressCb = cb;
    },
    onFirstPlay(cb: () => void) {
      firstPlayCb = cb;
    },
    seekTo(seconds: number) {
      if (seconds <= 1) return;
      if (player?.seekTo) player.seekTo(seconds, true);
      else pendingSeek = seconds;
    },
    play() {
      player?.playVideo?.();
    },
    pause() {
      player?.pauseVideo?.();
    },
    destroy() {
      destroyed = true;
      if (poller) clearInterval(poller);
      poller = null;
      player?.destroy?.();
      player = null;
    },
  };
}
