"use client";

import { useRef, type ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

// Horizontal scroll row with arrow controls.
export default function ScrollRow({ children, label, gap = 16 }: { children: ReactNode; label: string; gap?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => {
    if (ref.current) ref.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-3.5">
        <h2 className="text-[17px] font-bold text-textPrimary whitespace-nowrap">{label}</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => scroll(-1)} className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-textSecondary hover:text-primary hover:border-primary transition-colors"><IconChevronLeft size={16} /></button>
          <button onClick={() => scroll(1)} className="w-8 h-8 rounded-full border border-line flex items-center justify-center text-textSecondary hover:text-primary hover:border-primary transition-colors"><IconChevronRight size={16} /></button>
        </div>
      </div>
      <div ref={ref} className="flex overflow-x-auto no-scrollbar pb-1" style={{ gap }}>
        {children}
      </div>
    </div>
  );
}
