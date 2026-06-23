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

function ghlHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${Deno.env.get("GHL_PIT_TOKEN")}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export type GhlResult = { ok: boolean; status: number; body: unknown; attempts: number };

// Fetch with retry + exponential backoff on 429 / 5xx (MASTER §5, CONNECTION-MAP §5).
// 4xx (other than 429) is non-retryable — returned immediately.
async function ghlFetch(url: string, init: RequestInit, maxAttempts = 3): Promise<GhlResult> {
  let attempt = 0;
  let last: { status: number; body: unknown } = { status: 0, body: null };
  while (attempt < maxAttempts) {
    attempt++;
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch (err) {
      last = { status: 0, body: String((err as Error)?.message ?? err) };
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1)));
        continue;
      }
      break;
    }
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    if (res.ok) return { ok: true, status: res.status, body, attempts: attempt };
    last = { status: res.status, body };
    if (res.status === 429 || res.status >= 500) {
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 250 * 2 ** (attempt - 1)));
        continue;
      }
    }
    // non-retryable 4xx → stop
    return { ok: false, status: res.status, body, attempts: attempt };
  }
  return { ok: false, status: last.status, body: last.body, attempts: attempt };
}

// Add seg_ tag(s) to a contact (v2). Idempotent on GHL's side (re-adding is a no-op).
export async function addContactTags(contactId: string, tags: string[]): Promise<GhlResult> {
  return ghlFetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "POST",
    headers: ghlHeaders(),
    body: JSON.stringify({ tags }),
  });
}

// Remove seg_ tag(s) from a contact (v2).
export async function removeContactTags(contactId: string, tags: string[]): Promise<GhlResult> {
  return ghlFetch(`${GHL_BASE}/contacts/${contactId}/tags`, {
    method: "DELETE",
    headers: ghlHeaders(),
    body: JSON.stringify({ tags }),
  });
}

// Resolve a GHL contact id by email (GHL matches contacts by email).
// Used as a fallback when profiles.ghl_contact_id is missing.
export async function findContactByEmail(email: string): Promise<string | null> {
  const loc = Deno.env.get("GHL_LOCATION_ID");
  const url = `${GHL_BASE}/contacts/?locationId=${loc}&query=${encodeURIComponent(email)}`;
  const res = await ghlFetch(url, { method: "GET", headers: ghlHeaders() });
  if (!res.ok) return null;
  const contacts = ((res.body as any)?.contacts ?? []) as any[];
  const lower = email.toLowerCase();
  const match = contacts.find((c) => (c?.email ?? "").toLowerCase() === lower) ?? contacts[0];
  return match?.id ?? null;
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
    headers: ghlHeaders(),
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
