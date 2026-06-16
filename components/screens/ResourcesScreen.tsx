"use client";

// Static 1:1 shell (DESIGN-BRIEF nav target). FROZEN: do not expand scope in
// future phases without a MASTER.md update.

import { FIXTURES } from "@/lib/fixtures";
import ResourceRow from "@/components/ui/ResourceRow";
import { IconFolder } from "@/components/icons";

const FX = FIXTURES;

export default function ResourcesScreen({ onOpenLesson }: { onOpenLesson?: (id: string) => void }) {
  void onOpenLesson; // reserved for parity with the export's signature
  const groups = FX.modules
    .map((m) => ({
      module: m,
      items: m.lessons
        .filter((l) => l.resources.length)
        .flatMap((l) => l.resources.map((r) => ({ ...r, lessonId: l.id, lessonTitle: l.title }))),
    }))
    .filter((g) => g.items.length);
  return (
    <div className="px-6 lg:px-9 py-7 flex flex-col gap-8 max-w-[900px]">
      <p className="text-sm text-textSecondary -mt-1">Every worksheet, checklist, and download from your course, in one place.</p>
      {groups.map((g) => (
        <div key={g.module.id} className="flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <IconFolder size={18} className="text-primary" />
            <h2 className="text-[15px] font-bold text-textPrimary">{g.module.title}</h2>
            <span className="text-xs text-textSecondary">· {g.items.length} files</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.items.map((r) => <ResourceRow key={r.id} resource={r} sub={"From: " + r.lessonTitle} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
