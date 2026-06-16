"use client";

import { useEffect, useState } from "react";
import Placeholder from "@/components/ui/Placeholder";
import { BtnPrimary } from "@/components/ui/Buttons";
import { IconArrowRight, IconCheckCircle, IconX } from "@/components/icons";

// O1 — In-video pop-ad overlay. States: locked countdown · skippable · clicked.
export default function AdOverlay({
  asset,
  headline,
  ctaLabel,
  ctaUrl,
  skippableAfterS,
  onSkip,
  onClick,
  onClose,
}: {
  asset: string;
  headline: string;
  ctaLabel: string;
  ctaUrl: string;
  skippableAfterS: number;
  onSkip?: () => void;
  onClick?: (url: string) => void;
  onClose?: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(skippableAfterS);
  const [clicked, setClicked] = useState(false);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);
  const handleCta = () => {
    setClicked(true);
    onClick && onClick(ctaUrl);
    setTimeout(() => onClose && onClose(), 900);
  };
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-4 sm:p-8 rounded-2xl" style={{ background: "rgba(31,34,51,0.55)", backdropFilter: "blur(2px)" }}>
      <div className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden shadow-float">
        <Placeholder label={asset} className="aspect-video w-full" />
        <div className="p-5 sm:p-6 flex flex-col gap-4">
          <h3 className="text-lg font-bold text-textPrimary leading-[26px] text-center">{headline}</h3>
          <BtnPrimary onClick={handleCta} className="w-full">
            {clicked ? <span className="inline-flex items-center gap-2"><IconCheckCircle size={16} /> Opening…</span> : <span className="inline-flex items-center gap-2">{ctaLabel} <IconArrowRight size={16} /></span>}
          </BtnPrimary>
          <div className="flex justify-center h-5">
            {secondsLeft > 0
              ? <span className="text-xs text-textSecondary">Skip in {secondsLeft}s</span>
              : <button onClick={onSkip} className="text-xs font-semibold text-primary hover:text-primaryHover inline-flex items-center gap-1">Skip <IconX size={12} /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}
