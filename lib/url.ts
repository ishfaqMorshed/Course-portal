// ============================================================
// url.ts — basic URL normalization/validation for admin inputs (Phase 2.7-fix
// follow-up). Prevents doubled schemes like "https://https://…" and missing
// schemes. Empty is allowed (nullable fields).
// ============================================================

// Collapse repeated leading schemes and ensure a single http(s) scheme.
export function normalizeUrl(input: string): string {
  let s = (input ?? "").trim();
  if (!s) return "";
  // collapse one-or-more leading schemes ("https://https://" → keep the last one)
  s = s.replace(/^((?:https?:\/\/)+)/i, (m) => {
    const schemes = m.match(/https?:\/\//gi)!;
    return schemes[schemes.length - 1].toLowerCase();
  });
  // no scheme at all → default to https
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  return s;
}

// True when empty (allowed) or a well-formed http(s) URL.
export function isValidUrl(input: string): boolean {
  const s = (input ?? "").trim();
  if (!s) return true;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Normalize then validate. Returns the normalized value or throws on invalid.
export function cleanUrlOrThrow(input: string, label = "URL"): string {
  const n = normalizeUrl(input);
  if (!isValidUrl(n)) throw new Error(`${label} is not a valid URL.`);
  return n;
}
