// ============================================================
// wh-purchase-47 — inbound GHL $47-purchase webhook (MASTER §5, CONNECTION-MAP §5).
//
// Does: verify shared secret → confirm $47 product → idempotency check
//   → create/find auth user → upsert profile → enroll → segment=never_activated
//   → generate magic setup link → write it to GHL custom field portal_setup_url
//   → log to ghl_sync_log. Duplicate (same payment.transaction_id) → 200 no-op.
//
// OUT OF SCOPE this phase: GHL segment tag add (sync-segment-tag), events, ads.
// ============================================================

import { logSync, serviceClient, setContactCustomField } from "../_shared/ghl.ts";

const COURSE_47_SLUG = Deno.env.get("COURSE_47_SLUG") ?? "ecommerce-launch-blueprint";
const EXPECTED_47_PRODUCT_TITLE = Deno.env.get("EXPECTED_47_PRODUCT_TITLE") ?? "$47 The E-commerce Launch Blueprint";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // 1. Shared-secret header (MASTER §5).
  const secret = Deno.env.get("WH_PURCHASE_47_SECRET");
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const db = serviceClient();

  // 2. Map payload.
  const payment = body?.payment ?? {};
  const email: string | undefined = (payment?.customer?.email ?? body?.email)?.toLowerCase?.();
  const contactId: string | undefined = body?.contact_id ?? payment?.customer?.id;
  const fullName: string = body?.full_name ?? [body?.first_name, body?.last_name].filter(Boolean).join(" ").trim();
  const transactionId: string | undefined = payment?.transaction_id;
  const lineTitle: string | undefined = payment?.line_items?.[0]?.title;
  const totalAmount: number | undefined = payment?.total_amount;

  if (!email || !contactId || !transactionId) {
    return json({ error: "missing_required_fields", need: ["email", "contact_id", "payment.transaction_id"] }, 400);
  }

  // 3. Confirm this is the $47 product (total_amount === 47 + line-item title).
  const isFortySeven =
    totalAmount === 47 &&
    payment?.payment_status === "succeeded" &&
    (lineTitle === EXPECTED_47_PRODUCT_TITLE || (lineTitle ?? "").includes("$47"));
  if (!isFortySeven) {
    // Not our product / not paid — acknowledge so GHL doesn't retry forever.
    await logSync(db, { action: "wh-purchase-47:ignored", status: "success", response: { transactionId, lineTitle, totalAmount } });
    return json({ ok: true, ignored: "not_the_47_product" });
  }

  // 4. Idempotency — dedupe on payment.transaction_id.
  const { data: existing } = await db
    .from("ghl_sync_log")
    .select("id")
    .eq("action", "wh-purchase-47")
    .eq("status", "success")
    .filter("response->>transaction_id", "eq", transactionId)
    .limit(1);
  if (existing && existing.length > 0) {
    return json({ ok: true, deduped: true });
  }

  try {
    // 5. Create (or find) the auth user — magic-link sign-in, no password.
    const admin = db.auth.admin;
    const created = await admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, ghl_contact_id: contactId },
    });
    if (created.error && !/already|exists|registered/i.test(created.error.message)) {
      throw created.error;
    }

    // 6. Generate the magic setup link (also yields the user id for new & existing).
    const portalBase = Deno.env.get("PORTAL_BASE_URL")!;
    const link = await admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${portalBase}/auth/callback` },
    });
    if (link.error) throw link.error;
    const userId = link.data.user?.id;
    const setupUrl = link.data.properties?.action_link;
    if (!userId || !setupUrl) throw new Error("generateLink returned no user/action_link");

    // 7. Resolve the target course.
    const { data: course, error: courseErr } = await db
      .from("courses").select("id").eq("slug", COURSE_47_SLUG).single();
    if (courseErr || !course) throw courseErr ?? new Error(`course not found: ${COURSE_47_SLUG}`);

    // 8. Upsert profile · enroll · segment=never_activated.
    const up1 = await db.from("profiles").upsert(
      { user_id: userId, ghl_contact_id: contactId, email },
      { onConflict: "user_id" },
    );
    if (up1.error) throw up1.error;

    const enr = await db.from("enrollments").upsert(
      { user_id: userId, course_id: course.id, source: "ghl_purchase_47" },
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );
    if (enr.error) throw enr.error;

    const seg = await db.from("user_segments").upsert(
      { user_id: userId, course_id: course.id, segment: "never_activated", changed_at: new Date().toISOString() },
      { onConflict: "user_id,course_id" },
    );
    if (seg.error) throw seg.error;

    // 9. Write portal_setup_url into the GHL contact custom field (a GHL call → log it).
    const fieldId = Deno.env.get("GHL_SETUP_URL_FIELD_ID");
    if (fieldId) {
      const ghl = await setContactCustomField(contactId, fieldId, setupUrl);
      await logSync(db, {
        user_id: userId,
        action: "set_portal_setup_url",
        status: ghl.ok ? "success" : "failed",
        response: { transaction_id: transactionId, contact_id: contactId, http_status: ghl.status, body: ghl.body },
      });
      if (!ghl.ok) throw new Error(`GHL custom-field write failed (${ghl.status})`);
    } else {
      await logSync(db, {
        user_id: userId,
        action: "set_portal_setup_url:skipped",
        status: "failed",
        response: { transaction_id: transactionId, reason: "GHL_SETUP_URL_FIELD_ID not configured", setup_url: setupUrl },
      });
    }

    // 10. Audit + idempotency ledger row.
    await logSync(db, {
      user_id: userId,
      action: "wh-purchase-47",
      status: "success",
      response: { transaction_id: transactionId, contact_id: contactId, email, course_id: course.id, user_id: userId },
    });

    return json({ ok: true, user_id: userId, course_id: course.id });
  } catch (err) {
    await logSync(db, {
      action: "wh-purchase-47",
      status: "failed",
      response: { transaction_id: transactionId, contact_id: contactId, email, error: String((err as Error)?.message ?? err) },
    });
    // 5xx so GHL retries with backoff (MASTER §5).
    return json({ error: "processing_failed", detail: String((err as Error)?.message ?? err) }, 500);
  }
});
