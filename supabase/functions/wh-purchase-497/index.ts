// ============================================================
// wh-purchase-497 — inbound GHL $497-DFY-purchase webhook (MASTER §5, CONNECTION-MAP §5).
//
// Does: verify shared secret → confirm $497 product → idempotency check
//   → resolve the user by email → set user_segments.segment=dfy_purchased (terminal)
//   → log to ghl_sync_log. Duplicate (same payment.transaction_id) → 200 no-op.
//
// The tag swap (remove old seg_ tag, add seg_dfy_purchased) is handled by the
// user_segments AFTER trigger → sync-segment-tag, NOT here. Suppression of all
// further upsell sequences is enforced by recompute_segment()/run_segment_cron()
// treating dfy_purchased as terminal.
// ============================================================

import { logSync, serviceClient } from "../_shared/ghl.ts";

const COURSE_47_SLUG = Deno.env.get("COURSE_47_SLUG") ?? "ecommerce-launch-blueprint";
const EXPECTED_497_PRODUCT_TITLE = Deno.env.get("EXPECTED_497_PRODUCT_TITLE") ?? "$497 DFY";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 1. Shared-secret header.
  const secret = Deno.env.get("WH_PURCHASE_497_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  const db = serviceClient();

  let body: any;
  try {
    body = await req.json();
  } catch {
    // Log, don't vanish (MASTER §5 — every failure path is auditable).
    await logSync(db, { action: "wh-purchase-497", status: "failed", response: { error: "invalid_json" } });
    return json({ error: "invalid_json" }, 400);
  }

  // 2. Map payload (same envelope shape as wh-purchase-47).
  const payment = body?.payment ?? {};
  const email: string | undefined = (payment?.customer?.email ?? body?.email)?.toLowerCase?.();
  const contactId: string | undefined = body?.contact_id ?? payment?.customer?.id;
  const transactionId: string | undefined = payment?.transaction_id;
  const lineTitle: string | undefined = payment?.line_items?.[0]?.title;
  const totalAmount: number | undefined = payment?.total_amount;

  if (!email || !transactionId) {
    await logSync(db, {
      action: "wh-purchase-497",
      status: "failed",
      response: { error: "missing_required_fields", email, contact_id: contactId, transaction_id: transactionId },
    });
    return json({ error: "missing_required_fields", need: ["email", "payment.transaction_id"] }, 400);
  }

  // 3. Confirm this is the $497 product.
  const is497 =
    payment?.payment_status === "succeeded" &&
    (totalAmount === 497 || lineTitle === EXPECTED_497_PRODUCT_TITLE || (lineTitle ?? "").includes("$497"));
  if (!is497) {
    await logSync(db, {
      action: "wh-purchase-497:ignored",
      status: "success",
      response: { transaction_id: transactionId, lineTitle, totalAmount },
    });
    return json({ ok: true, ignored: "not_the_497_product" });
  }

  // 4. Idempotency — dedupe on payment.transaction_id.
  const { data: existing } = await db
    .from("ghl_sync_log")
    .select("id")
    .eq("action", "wh-purchase-497")
    .eq("status", "success")
    .filter("response->>transaction_id", "eq", transactionId)
    .limit(1);
  if (existing && existing.length > 0) {
    return json({ ok: true, deduped: true });
  }

  try {
    // 5. Resolve the user by email (the $497 buyer already exists from the $47 flow).
    const { data: profile } = await db
      .from("profiles")
      .select("user_id")
      .eq("email", email)
      .maybeSingle();
    if (!profile) {
      // Unknown buyer — acknowledge (200) so GHL doesn't retry forever; log for triage.
      await logSync(db, {
        action: "wh-purchase-497",
        status: "failed",
        response: { transaction_id: transactionId, email, contact_id: contactId, error: "user_not_found" },
      });
      return json({ ok: false, error: "user_not_found" }, 200);
    }
    const userId = profile.user_id;

    // 6. Resolve the target course.
    const { data: course, error: courseErr } = await db
      .from("courses").select("id").eq("slug", COURSE_47_SLUG).single();
    if (courseErr || !course) throw courseErr ?? new Error(`course not found: ${COURSE_47_SLUG}`);

    // 7. Set segment=dfy_purchased (terminal). The user_segments trigger fires
    //    sync-segment-tag → removes the old seg_ tag, adds seg_dfy_purchased.
    const seg = await db.from("user_segments").upsert(
      { user_id: userId, course_id: course.id, segment: "dfy_purchased", changed_at: new Date().toISOString() },
      { onConflict: "user_id,course_id" },
    );
    if (seg.error) throw seg.error;

    // 8. Audit + idempotency ledger row.
    await logSync(db, {
      user_id: userId,
      action: "wh-purchase-497",
      status: "success",
      response: { transaction_id: transactionId, email, contact_id: contactId, course_id: course.id, user_id: userId },
    });

    return json({ ok: true, user_id: userId, course_id: course.id });
  } catch (err) {
    await logSync(db, {
      action: "wh-purchase-497",
      status: "failed",
      response: { transaction_id: transactionId, email, contact_id: contactId, error: String((err as Error)?.message ?? err) },
    });
    // 5xx so GHL retries with backoff (MASTER §5).
    return json({ error: "processing_failed", detail: String((err as Error)?.message ?? err) }, 500);
  }
});
