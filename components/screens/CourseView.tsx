"use client";

import { useEffect, useState } from "react";
import { FIXTURES } from "@/lib/fixtures";
import { allLessons, findLesson, moduleOf, nextLessonId } from "@/lib/course";
import LessonThumbCard from "@/components/ui/LessonThumbCard";
import ScrollRow from "@/components/ui/ScrollRow";
import ProgressPill from "@/components/ui/ProgressPill";
import ResourceRow from "@/components/ui/ResourceRow";
import Toast from "@/components/ui/Toast";
import { BtnPrimary } from "@/components/ui/Buttons";
import MockPlayer from "@/components/player/MockPlayer";
import AdOverlay from "@/components/ad/AdOverlay";
import UpsellPanel from "@/components/upsell/UpsellPanel";
import {
  IconArrowRight,
  IconCheck,
  IconCheckCircle,
  IconChevronDown,
  IconChevronUp,
  IconCircle,
  IconFileText,
  IconPlay,
  IconTrophy,
} from "@/components/icons";
import type { Module, ProgressMap } from "@/lib/types";

const FX = FIXTURES;

function ModuleGroup({
  module,
  idx,
  progressMap,
  currentLessonId,
  onSelect,
  defaultOpen,
}: {
  module: Module;
  idx: number;
  progressMap: ProgressMap;
  currentLessonId: string;
  onSelect: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
  const done = module.lessons.filter((l) => (progressMap[l.id] ?? 0) >= 100).length;
  const total = module.lessons.length;
  const moduleDone = done === total;
  const isCurrent = module.lessons.some((l) => l.id === currentLessonId);
  return (
    <div className="border-b border-line last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-subtle/60 transition-colors text-left">
        <div className={"w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border-[1.5px] " + (
          moduleDone ? "bg-primary border-primary text-white" : isCurrent ? "border-primary text-primary" : "border-line text-textSecondary")}>
          {moduleDone ? <IconCheck size={13} strokeWidth={2.5} /> : idx + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className={"text-sm font-semibold truncate " + (isCurrent ? "text-primary" : "text-textPrimary")}>{module.title}</div>
          <div className="text-[11px] text-textSecondary mt-0.5">{done}/{total} lessons</div>
        </div>
        <span className="text-textSecondary">{open ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}</span>
      </button>
      {open && (
        <div className="pb-2 flex flex-col">
          {module.lessons.map((l) => {
            const p = progressMap[l.id] ?? 0;
            const state = p >= 100 ? "done" : p > 0 ? "partial" : "todo";
            const active = l.id === currentLessonId;
            return (
              <button key={l.id} onClick={() => onSelect(l.id)}
                className={"relative flex items-center gap-2.5 mx-2 px-3 py-2.5 rounded-[10px] text-left transition-colors " + (active ? "bg-primarySoft" : "hover:bg-subtle")}>
                {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary"></span>}
                <span className="shrink-0 flex items-center justify-center w-5">
                  {state === "done" && <span className="text-success"><IconCheck size={15} strokeWidth={2.5} /></span>}
                  {state === "partial" && <span className="text-primary"><IconPlay size={13} /></span>}
                  {state === "todo" && <span className="text-canvasDeep"><IconCircle size={14} /></span>}
                </span>
                <span className={"flex-1 text-[13px] leading-snug min-w-0 " + (active ? "font-semibold text-primary" : "font-medium text-textPrimary")}>{l.title}</span>
                <span className="text-[11px] text-textSecondary shrink-0">{l.duration}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CompletionPanel() {
  return (
    <div data-screen-label="Course complete" className="bg-white border border-line rounded-2xl shadow-card p-10 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-primarySoft text-primary flex items-center justify-center"><IconTrophy size={30} /></div>
      <div>
        <h2 className="text-2xl font-bold text-textPrimary leading-8">Course complete</h2>
        <p className="text-sm text-textSecondary mt-2 max-w-[400px]">You finished all {allLessons().length} lessons of AI Profit Systems. Every lesson stays unlocked — rewatch anything, anytime.</p>
      </div>
      <ProgressPill pct={100} className="w-48" />
    </div>
  );
}

// S3 — Course View (3-zone inside shell).
export default function CourseView({
  progressMap,
  setLessonPct,
  currentLessonId,
  setCurrentLessonId,
  onLogout,
  upsellOverride,
  adSignal,
  simSeconds,
  dev,
}: {
  progressMap: ProgressMap;
  setLessonPct: (id: string, pct: number) => void;
  currentLessonId: string;
  setCurrentLessonId: (id: string) => void;
  onLogout?: () => void;
  upsellOverride: string;
  adSignal: number;
  simSeconds: number;
  dev: boolean;
}) {
  void onLogout; // kept for parity with the export's signature
  const lesson = findLesson(currentLessonId) || allLessons()[0];
  const module = moduleOf(lesson.id)!;
  const [adOpen, setAdOpen] = useState(false);
  const [adShownFor, setAdShownFor] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const courseComplete = allLessons().every((l) => (progressMap[l.id] ?? 0) >= 100);

  useEffect(() => { if (adSignal > 0) setAdOpen(true); }, [adSignal]);
  useEffect(() => {
    const p = progressMap[lesson.id] ?? 0;
    if (p > 0 && p < 100) {
      setToast("Continuing where you left off — " + Math.round(p) + "% watched");
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id]);

  const closeAd = () => { setAdOpen(false); setAdShownFor((s) => ({ ...s, [lesson.id]: true })); };

  const upsellKey = upsellOverride && upsellOverride !== "auto" ? upsellOverride : null;
  const upsellConfig = courseComplete
    ? FX.upsellConfig.m5_complete
    : upsellKey
      ? Object.values(FX.upsellConfig).find((u) => String(u.intensity) === upsellKey) || FX.upsellConfig[FX.upsellModuleMap[module.id]]
      : FX.upsellConfig[FX.upsellModuleMap[module.id]];

  const nextId = nextLessonId(lesson.id);
  const ad = FX.adRule;
  const ls = allLessons();

  return (
    <div className="flex flex-col">
      {/* All Lessons horizontal row — above the module list, full width */}
      <div className="px-6 lg:px-9 pt-6 pb-5 border-b border-line">
        <ScrollRow label="All Lessons">
          {ls.map((l) => (
            <LessonThumbCard key={l.id} lesson={l} width={196} progress={progressMap[l.id] ?? 0} onClick={() => setCurrentLessonId(l.id)} />
          ))}
        </ScrollRow>
      </div>

      <div className="flex flex-col lg:flex-row min-h-0">
        {/* left: module list */}
        <aside className="lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-line">
          <div className="px-4 pt-5 pb-3"><div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Course content</div></div>
          {FX.modules.map((m, i) => (
            <ModuleGroup key={m.id} module={m} idx={i} progressMap={progressMap}
              currentLessonId={lesson.id} defaultOpen={m.id === module.id}
              onSelect={(id) => setCurrentLessonId(id)} />
          ))}
        </aside>

        {/* center + right */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col xl:flex-row gap-6 p-5 lg:p-8">
            <main className="flex-1 min-w-0 max-w-[760px] flex flex-col gap-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">{module.title}</div>
                <h1 className="text-2xl font-bold text-textPrimary leading-8 mt-1">{courseComplete ? "AI Profit Systems" : lesson.title}</h1>
              </div>

              {courseComplete ? (
                <CompletionPanel />
              ) : lesson.hasVideo ? (
                <div className="relative">
                  <MockPlayer lesson={lesson} pct={progressMap[lesson.id] ?? 0}
                    onPctChange={(p) => setLessonPct(lesson.id, p)}
                    adOpen={adOpen} adAlreadyShown={!!adShownFor[lesson.id]}
                    onAdTrigger={() => setAdOpen(true)} simSeconds={simSeconds} />
                  {adOpen && (
                    <AdOverlay asset={ad.assetLabel} headline={ad.headline} ctaLabel={ad.ctaLabel} ctaUrl={ad.ctaUrl}
                      skippableAfterS={ad.skippableAfterS} onSkip={closeAd} onClose={closeAd}
                      onClick={(url) => window.open(url, "_blank")} />
                  )}
                </div>
              ) : (
                <div className="bg-subtle rounded-2xl p-10 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-promo text-primary flex items-center justify-center"><IconFileText size={22} /></div>
                  <div>
                    <div className="text-[15px] font-semibold text-textPrimary">This lesson has no video</div>
                    <p className="text-sm text-textSecondary mt-1 max-w-[360px]">Work through the materials below, then mark the lesson complete yourself.</p>
                  </div>
                  {(progressMap[lesson.id] ?? 0) >= 100 ? (
                    <div className="inline-flex items-center gap-2 text-success text-sm font-semibold"><IconCheckCircle size={17} /> Completed</div>
                  ) : (
                    <BtnPrimary onClick={() => setLessonPct(lesson.id, 100)}><IconCheck size={16} /> Mark complete</BtnPrimary>
                  )}
                </div>
              )}

              {!courseComplete && (
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-textSecondary leading-[22px] max-w-[560px]">{FX.lessonDescriptions.default}</p>
                  {nextId && (
                    <button onClick={() => setCurrentLessonId(nextId)} className="shrink-0 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primaryHover">
                      Next lesson <IconArrowRight size={15} />
                    </button>
                  )}
                </div>
              )}

              {!courseComplete && lesson.resources.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="text-lg font-bold text-textPrimary">Additional Materials</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {lesson.resources.map((r) => <ResourceRow key={r.id} resource={r} />)}
                  </div>
                </div>
              )}

              {/* dev-only ad-trigger hint (gated by ?dev=1) */}
              {dev && !courseComplete && lesson.hasVideo && (
                <div className="border-[1.5px] border-dashed border-canvasDeep rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-textSecondary">dev: pop-ad fires at {ad.triggerAtPct}% of any video</span>
                  <button onClick={() => setAdOpen(true)} className="font-mono text-[11px] font-semibold text-primary underline">trigger ad now</button>
                </div>
              )}
            </main>

            <aside className="w-full xl:w-[300px] shrink-0">
              <div className="xl:sticky xl:top-2"><UpsellPanel config={upsellConfig} /></div>
            </aside>
          </div>
        </div>
      </div>
      <Toast message={toast || ""} visible={!!toast} />
    </div>
  );
}
