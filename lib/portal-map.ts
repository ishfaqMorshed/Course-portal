// ============================================================
// portal-map.ts — pure mappers/resolvers from live DB rows to the portal's
// presentation shapes. No client/server imports → usable in both. Phase 2.7-fix.
// ============================================================

import type { AdRuleRow, TriggerType, UpsellRow } from "@/lib/admin/types";
import type { SidebarPromo, UpsellConfig } from "@/lib/types";

// upsell_config row → UpsellPanel's UpsellConfig.
// socialProof / urgency are not DB columns → null (they were fixture-only copy).
export function mapUpsell(row: UpsellRow): UpsellConfig {
  return {
    intensity: row.intensity,
    placement: row.placement,
    headline: row.headline,
    body: row.body,
    cta: row.cta_label,
    url: row.cta_url,
    socialProof: null,
    urgency: null,
    imageUrl: row.image_url ?? null,
  };
}

// Rail upsell for the current module (placement='rail', module_id matches).
export function resolveRailUpsell(upsells: UpsellRow[], moduleId: string | null): UpsellConfig | undefined {
  const row = upsells.find((u) => u.placement === "rail" && u.module_id === moduleId);
  return row ? mapUpsell(row) : undefined;
}

// Completion upsell (placement='completion').
export function resolveCompletionUpsell(upsells: UpsellRow[]): UpsellConfig | undefined {
  const row = upsells.find((u) => u.placement === "completion");
  return row ? mapUpsell(row) : undefined;
}

// Global sidebar promo (placement='sidebar_promo', module_id null) → SidebarPromo.
export function resolveSidebarPromo(upsells: UpsellRow[]): SidebarPromo | null {
  const row = upsells.find((u) => u.placement === "sidebar_promo");
  if (!row) return null;
  return {
    line1: row.headline,
    line2: row.body,
    cta: row.cta_label,
    url: row.cta_url,
    imageUrl: row.image_url ?? null,
    illustrationLabel: "promo art",
  };
}

// Resolved live ad (richer than the fixture AdRule type). Carries the raw
// trigger so the player can fire on pct OR timestamp_s; headline/cta_label fall
// back to neutral defaults when the admin hasn't set them; assetUrl is the image.
export interface ResolvedAd {
  triggerType: TriggerType;
  triggerValue: number;
  skippableAfterS: number;
  headline: string;
  ctaLabel: string;
  ctaUrl: string;
  assetUrl: string | null;
}

export const AD_DEFAULT_HEADLINE = "A quick message before you continue";
export const AD_DEFAULT_CTA_LABEL = "Learn more";

// Most-specific scope wins: lesson > module > course (active rules only).
// Both pct and timestamp_s rules resolve; the player maps the trigger to time.
export function resolveAdRule(
  adRules: AdRuleRow[],
  lessonId: string,
  moduleId: string | null,
): ResolvedAd | undefined {
  const active = adRules.filter((r) => r.active);
  const row =
    active.find((r) => r.scope === "lesson" && r.lesson_id === lessonId) ??
    active.find((r) => r.scope === "module" && r.module_id === moduleId) ??
    active.find((r) => r.scope === "course");
  if (!row) return undefined;
  return {
    triggerType: row.trigger_type,
    triggerValue: Number(row.trigger_value),
    skippableAfterS: row.skippable_after_s,
    headline: row.headline?.trim() || AD_DEFAULT_HEADLINE,
    ctaLabel: row.cta_label?.trim() || AD_DEFAULT_CTA_LABEL,
    ctaUrl: row.cta_url ?? "",
    assetUrl: row.asset_url ?? null,
  };
}

// Map a resolved ad's trigger to the mock player's pct axis (Phase 2.7): pct
// rules use the value directly; timestamp_s is approximated against the demo
// length (simSeconds). Exact seconds = Phase 3 real player.
export function mockTriggerPct(ad: ResolvedAd, simSeconds: number): number {
  if (ad.triggerType === "pct") return Math.min(100, Math.max(0, ad.triggerValue));
  return Math.min(100, Math.max(0, (ad.triggerValue / Math.max(1, simSeconds)) * 100));
}
