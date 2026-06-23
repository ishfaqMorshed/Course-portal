// ============================================================
// push-lesson-event — outbound per-lesson GHL event (MASTER §5, CONNECTION-MAP §5, D3).
//
// Invoked by the browser (supabase.functions.invoke) ONLY after complete_lesson
// reports a NEW completion. Flow:
//   verify caller JWT → resolve user → load email (MANDATORY) + ghl_contact_id +
//   course/module/lesson titles + completed_at (service role) → idempotency check
//   on ghl_sync_log → POST {email, contact_id, course, module, lesson, lesson_id,
//   completed_at} to GHL_LESSON_EVENT_WEBHOOK_URL → write ghl_sync_log (success|failed).
//
// email is MANDATORY — GHL inbound webhooks resolve the contact by email, not
// contact_id (CONNECTION-MAP §5). Segment-tag sync stays Phase 4 (this fn never
// touches tags). Idempotent: a prior success row for (user, lesson) → 200 no-op.
// ============================================================

import { fetchWithRetry, logSync, serviceClient } from "../_shared/ghl.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const db = serviceClient();

  // 1. Authenticate the caller from their bearer token (the user's access token,
  //    forwarded by supabase.functions.invoke).
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const { data: { user }, error: authErr } = await db.auth.getUser(token);
  if (authErr || !user) return json({ error: "unauthorized" }, 401);

  // 2. Input.
  let body: { lesson_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const lessonId = body?.lesson_id;
  if (!lessonId) return json({ error: "missing_lesson_id" }, 400);

  // 3. Idempotency — already pushed for this user+lesson?
  const { data: dup } = await db
    .from("ghl_sync_log")
    .select("id")
    .eq("user_id", user.id)
    .eq("action", "push-lesson-event")
    .eq("status", "success")
    .filter("response->>lesson_id", "eq", lessonId)
    .limit(1);
  if (dup && dup.length > 0) return json({ ok: true, deduped: true });

  // 4. Resolve email (mandatory) + contact id + titles + completed_at.
  const { data: profile } = await db
    .from("profiles")
    .select("email, ghl_contact_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const email = (profile?.email ?? user.email ?? "").toLowerCase();
  const contactId = profile?.ghl_contact_id ?? null;

  const { data: lessonRow, error: lessonErr } = await db
    .from("lessons")
    .select("title, modules!inner(title, courses!inner(title))")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonErr || !lessonRow) {
    await logSync(db, {
      user_id: user.id,
      action: "push-lesson-event",
      status: "failed",
      response: { lesson_id: lessonId, error: "lesson_not_found" },
    });
    return json({ ok: false, error: "lesson_not_found" }, 200);
  }
  // Supabase nests embedded rows; titles come back as objects.
  const moduleRow = (lessonRow as any).modules;
  const courseTitle = moduleRow?.courses?.title ?? "";
  const moduleTitle = moduleRow?.title ?? "";
  const lessonTitle = (lessonRow as any).title ?? "";

  const { data: lp } = await db
    .from("lesson_progress")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  const completedAt = lp?.completed_at ?? new Date().toISOString();

  // email is the GHL match key — refuse (and log) if we don't have one.
  if (!email) {
    await logSync(db, {
      user_id: user.id,
      action: "push-lesson-event",
      status: "failed",
      response: { lesson_id: lessonId, error: "missing_email", contact_id: contactId },
    });
    return json({ ok: false, error: "missing_email" }, 200);
  }

  const webhookUrl = Deno.env.get("GHL_LESSON_EVENT_WEBHOOK_URL");
  if (!webhookUrl) {
    await logSync(db, {
      user_id: user.id,
      action: "push-lesson-event",
      status: "failed",
      response: { lesson_id: lessonId, error: "GHL_LESSON_EVENT_WEBHOOK_URL not configured" },
    });
    return json({ ok: false, error: "webhook_not_configured" }, 200);
  }

  // 5. POST the event to the GHL inbound webhook.
  const payload = {
    email,
    contact_id: contactId,
    course: courseTitle,
    module: moduleTitle,
    lesson: lessonTitle,
    lesson_id: lessonId,
    completed_at: completedAt,
  };

  // Retry + exponential backoff on 429/5xx + network errors (MASTER §5). A
  // transient failure must not silently lose the completion note — fetchWithRetry
  // never throws; it surfaces the final result + attempt count, which we log.
  const res = await fetchWithRetry(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  await logSync(db, {
    user_id: user.id,
    action: "push-lesson-event",
    status: res.ok ? "success" : "failed",
    response: { lesson_id: lessonId, contact_id: contactId, email, http_status: res.status, attempts: res.attempts, body: res.body },
  });
  if (!res.ok) return json({ ok: false, http_status: res.status, attempts: res.attempts }, 200);
  return json({ ok: true, attempts: res.attempts });
});
