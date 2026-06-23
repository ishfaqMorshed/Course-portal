// ============================================================
// sync-segment-tag — outbound GHL tag swap on segment change
// (MASTER §4/§5, CONNECTION-MAP §5).
//
// Triggered by the `user_segments` AFTER trigger via pg_net (NOT the browser).
// verify_jwt=false; authenticated by a shared-secret header (the trigger reads
// the secret from Supabase Vault). Receives {user_id, course_id, old_segment,
// new_segment}.
//
// Does: resolve the GHL contact (profiles.ghl_contact_id, else lookup by email)
//   → add seg_<new_segment> → remove seg_<old_segment> (so a contact is only
//   ever in ONE upsell sequence) → write ghl_sync_log for each call.
// Retry/backoff on 429/5xx lives in _shared/ghl.ts (ghlFetch).
//
// The terminal/suppression rule (dfy_purchased never transitions away) is
// enforced upstream in recompute_segment()/run_segment_cron(); this function
// only mirrors whatever segment landed in user_segments.
// ============================================================

import {
  addContactTags,
  findContactByEmail,
  logSync,
  removeContactTags,
  serviceClient,
} from "../_shared/ghl.ts";

const VALID_SEGMENTS = new Set([
  "never_activated",
  "not_started",
  "active",
  "stalled",
  "completer",
  "dfy_purchased",
]);

function tagFor(segment: string): string {
  return `seg_${segment}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Shared-secret header (the pg_net trigger sends it from Vault).
  const secret = Deno.env.get("SYNC_SEGMENT_TAG_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: { user_id?: string; course_id?: string; old_segment?: string | null; new_segment?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const userId = body?.user_id;
  const courseId = body?.course_id ?? null;
  const oldSegment = body?.old_segment ?? null;
  const newSegment = body?.new_segment;
  if (!userId || !newSegment || !VALID_SEGMENTS.has(newSegment)) {
    return json({ error: "missing_or_invalid_fields", need: ["user_id", "new_segment"] }, 400);
  }

  const db = serviceClient();

  // Resolve the GHL contact: stored id first, then email lookup.
  const { data: profile } = await db
    .from("profiles")
    .select("ghl_contact_id, email")
    .eq("user_id", userId)
    .maybeSingle();
  const email = (profile?.email ?? "").toLowerCase();
  let contactId = profile?.ghl_contact_id ?? null;
  if (!contactId && email) contactId = await findContactByEmail(email);

  const newTag = tagFor(newSegment);

  if (!contactId) {
    await logSync(db, {
      user_id: userId,
      action: "sync-segment-tag",
      tag: newTag,
      status: "failed",
      response: { error: "contact_not_found", email, course_id: courseId, new_segment: newSegment },
    });
    return json({ ok: false, error: "contact_not_found" }, 200);
  }

  // 1. Add the new tag.
  const addRes = await addContactTags(contactId, [newTag]);
  await logSync(db, {
    user_id: userId,
    action: "sync-segment-tag:add",
    tag: newTag,
    status: addRes.ok ? "success" : "failed",
    response: {
      contact_id: contactId,
      course_id: courseId,
      http_status: addRes.status,
      attempts: addRes.attempts,
      body: addRes.body,
    },
  });

  // 2. Remove the previous tag (only when there was one, and it differs).
  let removeOk = true;
  if (oldSegment && oldSegment !== newSegment && VALID_SEGMENTS.has(oldSegment)) {
    const oldTag = tagFor(oldSegment);
    const remRes = await removeContactTags(contactId, [oldTag]);
    removeOk = remRes.ok;
    await logSync(db, {
      user_id: userId,
      action: "sync-segment-tag:remove",
      tag: oldTag,
      status: remRes.ok ? "success" : "failed",
      response: {
        contact_id: contactId,
        course_id: courseId,
        http_status: remRes.status,
        attempts: remRes.attempts,
        body: remRes.body,
      },
    });
  }

  const ok = addRes.ok && removeOk;
  return json({ ok, contact_id: contactId, added: newTag, removed: oldSegment ? tagFor(oldSegment) : null }, 200);
});
