// ============================================================
// types.ts — the common player-adapter interface (Phase 3).
// One interface over three providers (Vimeo / YouTube / HTML5) so the tracking
// engine stays provider-agnostic. All adapters report the same normalized
// progress signal {percent (0..1), seconds, duration} and expose imperative
// controls so the ad engine can pause/resume the underlying player.
// ============================================================

export interface PlayerProgress {
  percent: number; // 0..1 (seconds / duration, clamped)
  seconds: number; // current playback position, seconds
  duration: number; // total length, seconds (0 until known)
}

export interface PlayerAdapter {
  // Vimeo `timeupdate` · YouTube poll of getCurrentTime/getDuration · HTML5 `timeupdate`.
  onProgress(cb: (p: PlayerProgress) => void): void;
  // First transition into "playing" — used once-per-lesson for `lesson_started`.
  onFirstPlay(cb: () => void): void;
  // Resume support — seek to last_position (no-op if already past it).
  seekTo(seconds: number): void;
  play(): void; // ad finished → resume
  pause(): void; // ad shown → pause
  destroy(): void; // remove listeners / clear pollers / tear down the player
}

// What a provider adapter needs to mount. `ref` is the generic video reference
// (Vimeo ID, YouTube ID, or a direct URL per video_source — see provider.ts).
export interface AdapterMount {
  container: HTMLElement; // the adapter mounts its iframe/video element here
  ref: string;
}
