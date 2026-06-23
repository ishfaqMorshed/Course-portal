"use client";

// Phase 2.7-fix follow-up — upload upsell promo art to the public `upsell-images`
// Storage bucket (migration 0008). Writes are RLS-gated to admins via is_admin();
// the returned public URL is stored in upsell_config.image_url.

import { createClient } from "@/lib/supabase/client";

const BUCKET = "upsell-images";

export async function uploadUpsellImage(courseId: string, file: File): Promise<string> {
  const supabase = createClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "img";
  const path = `${courseId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
