"use client";

// Static 1:1 shell (DESIGN-BRIEF nav target). Phase 2.7-fix: resources read live
// from the course tree (Module[]) instead of fixtures — same visual structure.

import ResourceRow from "@/components/ui/ResourceRow";
import { IconFolder } from "@/components/icons";
import type { Module } from "@/lib/types";

export default function ResourcesScreen({ modules = [], onOpenLesson }: { modules?: Module[]; onOpenLesson?: (id: string) => void }) {
  void onOpenLesson; // reserved for parity with the export's signature
  const groups = modules
    .map((m) => ({
      module: m,
      items: m.lessons
        .filter((l) => l.resources.length)
        .flatMap((l) => l.resources.map((r, i) => ({ ...r, key: (r.id ?? r.name) + ":" + i, lessonId: l.id, lessonTitle: l.title }))),
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
            {g.items.map((r) => <ResourceRow key={r.key} resource={r} sub={"From: " + r.lessonTitle} />)}
          </div>
        </div>
      ))}
      {groups.length === 0 && <p className="text-sm text-textSecondary">No resources yet.</p>}
    </div>
  );
}
