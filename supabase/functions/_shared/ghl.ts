// ============================================================
// _shared/ghl.ts — GoHighLevel v2 helpers + ghl_sync_log writer.
// CLAUDE.md rule: every GHL call writes a ghl_sync_log row (success or failure).
// Credentials are read from Edge secrets ONLY — never shipped to the browser.
// ============================================================

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

export function serviceClient(): SupabaseClient {
  // SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are auto-injected into the Edge runtime.
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export async function logSync(
  db: SupabaseClient,
  row: { user_id?: string | null; action: string; tag?: string | null; status: "success" | "failed"; response?: unknown },
): Promise<void> {
  await db.from("ghl_sync_log").insert({
    user_id: row.user_id ?? null,
    action: row.action,
    tag: row.tag ?? null,
    status: row.status,
    response: row.response ?? null,
  });
}

// Write the portal setup URL into a GHL contact custom field (v2).
// Returns the raw response body (logged to ghl_sync_log by the caller).
export async function setContactCustomField(
  contactId: string,
  fieldId: string,
  value: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(`${GHL_BASE}/contacts/${contactId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${Deno.env.get("GHL_PIT_TOKEN")}`,
      Version: GHL_VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ customFields: [{ id: fieldId, value }] }),
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { ok: res.ok, status: res.status, body };
}
