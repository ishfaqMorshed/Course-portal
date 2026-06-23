"use client";

// Phase 2.7-fix follow-up — upload admin images to the public `upsell-images`
// Storage bucket (migration 0008). Writes are RLS-gated to admins via is_admin();
// the returned public URL is stored on the relevant row. Phase 7 reuses this same
// bucket for course/lesson thumbnails (a distinct path prefix keeps them apart).

import { createClient } from "@/lib/supabase/client";

const BUCKET = "upsell-images";

// Upload `file` to `${courseId}/${prefix}<uuid>.<ext>` in the public bucket and
// return its public URL. `prefix` namespaces asset kinds within one course folder.
async function uploadToBucket(courseId: string, file: File, prefix = ""): Promise<string> {
  const supabase = createClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "img";
  const path = `${courseId}/${prefix}${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Upsell promo art → upsell_config.image_url.
export async function uploadUpsellImage(courseId: string, file: File): Promise<string> {
  return uploadToBucket(courseId, file);
}

// Course/lesson thumbnail art → courses.thumbnail_url / lessons.thumbnail_url
// (Phase 7). `thumb/` prefix distinguishes it from promo art in the same bucket.
export async function uploadThumbnail(courseId: string, file: File): Promise<string> {
  return uploadToBucket(courseId, file, "thumb/");
}
