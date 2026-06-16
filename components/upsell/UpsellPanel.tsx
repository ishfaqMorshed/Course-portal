"use client";

import { BtnPrimary, BtnSecondary } from "@/components/ui/Buttons";
import { IconArrowRight, IconClock, IconExternalLink, IconZap } from "@/components/icons";
import type { UpsellConfig } from "@/lib/types";

// Right-rail upsell panel — 3 intensity tiers (DESIGN-SYSTEM §5).
export default function UpsellPanel({ config }: { config?: UpsellConfig }) {
  if (!config) return null;
  const tier = config.intensity >= 5 ? 3 : config.intensity >= 3 ? 2 : 1;
  const shells: Record<number, string> = { 1: "bg-subtle", 2: "bg-promo", 3: "bg-primary text-white" };
  const open = () => window.open(config.url, "_blank");
  return (
    <div data-comment-anchor="upsell-panel" className={"rounded-2xl p-6 transition-colors " + shells[tier]}>
      {tier === 3 && config.urgency && (
        <div className="inline-flex items-center gap-1.5 bg-white/15 text-white text-xs font-semibold rounded-full px-3 py-1.5 mb-4">
          <IconClock size={13} /> {config.urgency}
        </div>
      )}
      {tier === 1 && <div className="inline-flex items-center gap-1.5 text-textSecondary text-xs font-semibold uppercase tracking-wide mb-3"><IconZap size={13} /> Go further</div>}
      {tier === 2 && <div className="inline-flex items-center gap-1.5 text-primary text-xs font-semibold uppercase tracking-wide mb-3"><IconZap size={13} /> Recommended for you</div>}
      <h3 className={"text-lg font-bold leading-[26px] " + (tier === 3 ? "text-white" : "text-textPrimary")}>{config.headline}</h3>
      <p className={"text-sm leading-[22px] mt-2 " + (tier === 3 ? "text-white/80" : "text-textSecondary")}>{config.body}</p>
      {config.socialProof && tier !== 3 && (
        <div className="flex items-center gap-2 mt-4">
          <div className="flex -space-x-1.5">
            {["#5A60EA", "#8B8FF0", "#BDBFF7"].map((c, i) => <div key={i} className="w-6 h-6 rounded-full border-2 border-white" style={{ background: c }}></div>)}
          </div>
          <span className="text-xs text-textSecondary">{config.socialProof}</span>
        </div>
      )}
      <div className="mt-5">
        {tier === 1 && <BtnSecondary onClick={open} className="w-full">{config.cta}</BtnSecondary>}
        {tier === 2 && <BtnPrimary onClick={open} className="w-full">{config.cta} <IconArrowRight size={16} /></BtnPrimary>}
        {tier === 3 && (
          <button onClick={open} className="w-full inline-flex items-center justify-center gap-2 bg-white text-primary text-sm font-bold rounded-[10px] px-5 py-3 hover:bg-primarySoft transition-colors">
            {config.cta} <IconExternalLink size={15} />
          </button>
        )}
      </div>
      {config.socialProof && tier === 3 && <p className="text-xs text-white/70 text-center mt-3">{config.socialProof}</p>}
    </div>
  );
}
