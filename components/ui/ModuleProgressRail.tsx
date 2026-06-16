"use client";

import ProgressPill from "@/components/ui/ProgressPill";
import { IconCheck, IconChevronRight } from "@/components/icons";
import type { Module, ProgressMap } from "@/lib/types";

// Numbered module progress rail (reference right rail).
export default function ModuleProgressRail({
  modules,
  progressMap,
  currentModuleId,
  onSelectModule,
  pctTotal,
}: {
  modules: Module[];
  progressMap: ProgressMap;
  currentModuleId: string;
  onSelectModule?: (m: Module) => void;
  pctTotal: number;
}) {
  return (
    <div className="bg-white border border-line rounded-2xl p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-bold text-textPrimary">Your Course Progress</h3>
        <span className="text-xs font-semibold text-primary">{pctTotal}%</span>
      </div>
      <ProgressPill pct={pctTotal} className="mt-3 mb-4" />
      <div className="flex flex-col">
        {modules.map((m, i) => {
          const done = m.lessons.filter((l) => (progressMap[l.id] ?? 0) >= 100).length;
          const total = m.lessons.length;
          const moduleDone = done === total;
          const isCurrent = m.id === currentModuleId;
          const started = m.lessons.some((l) => (progressMap[l.id] ?? 0) > 0);
          return (
            <button key={m.id} onClick={() => onSelectModule && onSelectModule(m)} className="flex items-center gap-3 py-2.5 text-left group">
              <span className={
                "w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold shrink-0 border-[1.5px] " +
                (moduleDone ? "bg-primary border-primary text-white" : isCurrent || started ? "border-primary text-primary" : "border-line text-textSecondary")
              }>
                {moduleDone ? <IconCheck size={13} strokeWidth={2.5} /> : i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className={"text-[13px] font-semibold truncate " + (isCurrent ? "text-primary" : "text-textPrimary group-hover:text-primary")}>{m.title}</div>
                <div className="text-[11px] text-textSecondary">{done}/{total} lessons</div>
              </div>
              <IconChevronRight size={15} className="text-canvasDeep group-hover:text-primary" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
