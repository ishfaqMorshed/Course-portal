// ============================================================
// factory.ts — pick the provider adapter from video_source/ref.
// ============================================================

import { createHtml5Adapter } from "./html5";
import { resolveProvider } from "./provider";
import { createVimeoAdapter } from "./vimeo";
import { createYouTubeAdapter } from "./youtube";
import type { AdapterMount, PlayerAdapter } from "./types";
import type { Lesson } from "@/lib/types";

export function createAdapter(
  source: Lesson["videoSource"] | undefined,
  mount: AdapterMount,
): PlayerAdapter {
  const provider = resolveProvider(source, mount.ref);
  if (provider === "vimeo") return createVimeoAdapter(mount);
  if (provider === "youtube") return createYouTubeAdapter(mount);
  return createHtml5Adapter(mount);
}
