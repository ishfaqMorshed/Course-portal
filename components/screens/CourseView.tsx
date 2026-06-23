"use client";

import { useEffect, useRef, useState } from "react";
import { allLessons, findLesson, moduleOf, nextLessonId } from "@/lib/course";
import { adShouldFire, resolveAdRule, resolveCompletionUpsell, resolveRailUpsell } from "@/lib/portal-map";
import { track } from "@/lib/track";
import LessonThumbCard from "@/components/ui/LessonThumbCard";
import ScrollRow from "@/components/ui/ScrollRow";
import ProgressPill from "@/components/ui/ProgressPill";
import ResourceRow from "@/components/ui/ResourceRow";
import Toast from "@/components/ui/Toast";
import { BtnPrimary, BtnSecondary } from "@/components/ui/Buttons";
import LessonPlayer, { type LessonPlayerHandle } from "@/components/player/LessonPlayer";
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
import type { AdRuleRow, UpsellRow } from "@/lib/admin/types";
import type { Course, Module, ProgressMap } from "@/lib/types";

const DEFAULT_LESSON_DESC =
  "Work through this lesson, then continue to the next. Resources for the lesson appear below when available.";

function ModuleGroup({
  module,
  idx,
  progressMap,
  completedSet,
  currentLessonId,
  onSelect,
  defaultOpen,
}: {
  module: Module;
  idx: number;
  progressMap: ProgressMap;
  completedSet: Set<string>;
  currentLessonId: string;
  onSelect: (id: string) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { if (defaultOpen) setOpen(true); }, [defaultOpen]);
  const done = module.lessons.filter((l) => completedSet.has(l.id)).length;
  const total = module.lessons.length;
  const moduleDone = total > 0 && done === total;
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
            const state = completedSet.has(l.id) ? "done" : p > 0 ? "partial" : "todo";
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

function CompletionPanel({ total, courseTitle }: { total: number; courseTitle: string }) {
  return (
    <div data-screen-label="Course complete" className="bg-white border border-line rounded-2xl shadow-card p-10 flex flex-col items-center text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-primarySoft text-primary flex items-center justify-center"><IconTrophy size={30} /></div>
      <div>
        <h2 className="text-2xl font-bold text-textPrimary leading-8">Course complete</h2>
        <p className="text-sm text-textSecondary mt-2 max-w-[400px]">You finished all {total} lessons of {courseTitle}. Every lesson stays unlocked — rewatch anything, anytime.</p>
      </div>
      <ProgressPill pct={100} className="w-48" />
    </div>
  );
}

// S3 — Course View (3-zone inside shell). Phase 2.7-fix: live tree/upsell/ads.
export default function CourseView({
  modules,
  course,
  upsells,
  adRules,
  progressMap,
  completedSet,
  setLessonPct,
  markComplete,
  currentLessonId,
  setCurrentLessonId,
  onLogout,
  adSignal,
  dev,
}: {
  modules: Module[];
  course: Course | null;
  upsells: UpsellRow[];
  adRules: AdRuleRow[];
  progressMap: ProgressMap;
  completedSet: Set<string>;
  setLessonPct: (id: string, pct: number) => void;
  markComplete: (id: string) => void;
  currentLessonId: string;
  setCurrentLessonId: (id: string) => void;
  onLogout?: () => void;
  adSignal: number;
  dev: boolean;
}) {
  void onLogout; // kept for parity with the export's signature
  const ls = allLessons(modules);
  const lesson = findLesson(modules, currentLessonId) || ls[0];
  const [adOpen, setAdOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const playerRef = useRef<LessonPlayerHandle>(null);
  // Once-per-lesson-per-session ad guard (a ref so a backward scrub never
  // re-triggers — CONNECTION-MAP §4.5 — without forcing a re-render).
  const adFiredRef = useRef<Record<string, boolean>>({});

  const ad = lesson ? resolveAdRule(adRules, lesson.id, moduleOf(modules, lesson.id)?.id ?? null) : undefined;
  const courseId = course?.id ?? null;

  const closeAd = () => { setAdOpen(false); playerRef.current?.play(); };
  const onAdSkip = () => { void track("ad_skip", { lesson_id: lesson?.id }, courseId); closeAd(); };
  // ad_click: track + open; AdOverlay's own onClose handles resume after its
  // "Opening…" animation, so we don't close here.
  const onAdClick = (url: string) => {
    void track("ad_click", { lesson_id: lesson?.id }, courseId);
    if (url) window.open(url, "_blank");
  };

  // Real player progress (provider-agnostic): live pct bar + ad firing on the
  // rule's pct/timestamp_s against real seconds.
  const handleProgress = (percent: number, seconds: number) => {
    if (!lesson) return;
    setLessonPct(lesson.id, Math.round(percent * 100));
    if (ad && !adOpen && !adFiredRef.current[lesson.id] && adShouldFire(ad, percent, seconds)) {
      adFiredRef.current[lesson.id] = true;
      playerRef.current?.pause();
      setAdOpen(true);
      void track("ad_view", { lesson_id: lesson.id }, courseId);
    }
  };

  // Dev "Trigger pop-ad" affordance — opens the overlay + pauses, no event.
  useEffect(() => {
    if (adSignal > 0 && ad) { setAdOpen(true); playerRef.current?.pause(); }
  }, [adSignal, ad]);

  useEffect(() => {
    if (!lesson) return;
    const p = progressMap[lesson.id] ?? 0;
    if (!completedSet.has(lesson.id) && p > 0) {
      setToast("Continuing where you left off — " + Math.round(p) + "% watched");
      const t = setTimeout(() => setToast(null), 3200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id]);

  if (!lesson) {
    return (
      <div className="p-8">
        <div className="bg-white border border-line rounded-2xl shadow-card p-10 text-center">
          <p className="text-sm text-textSecondary">No lessons published for this course yet.</p>
        </div>
      </div>
    );
  }

  const module = moduleOf(modules, lesson.id)!;
  const courseComplete = ls.length > 0 && ls.every((l) => completedSet.has(l.id));
  const lessonDone = completedSet.has(lesson.id);

  const upsellConfig = courseComplete
    ? resolveCompletionUpsell(upsells)
    : resolveRailUpsell(upsells, module.id);

  const nextId = nextLessonId(modules, lesson.id);

  return (
    <div className="flex flex-col">
      {/* All Lessons horizontal row — above the module list, full width */}
      <div className="px-6 lg:px-9 pt-6 pb-5 border-b border-line">
        <ScrollRow label="All Lessons">
          {ls.map((l) => (
            <LessonThumbCard key={l.id} lesson={l} width={196} progress={progressMap[l.id] ?? 0}
              completed={completedSet.has(l.id)} onClick={() => setCurrentLessonId(l.id)} />
          ))}
        </ScrollRow>
      </div>

      <div className="flex flex-col lg:flex-row min-h-0">
        {/* left: module list */}
        <aside className="lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-line">
          <div className="px-4 pt-5 pb-3"><div className="text-xs font-semibold uppercase tracking-wide text-textSecondary">Course content</div></div>
          {modules.map((m, i) => (
            <ModuleGroup key={m.id} module={m} idx={i} progressMap={progressMap} completedSet={completedSet}
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
                <h1 className="text-2xl font-bold text-textPrimary leading-8 mt-1">{courseComplete ? (course?.title ?? "Course") : lesson.title}</h1>
              </div>

              {courseComplete ? (
                <CompletionPanel total={ls.length} courseTitle={course?.title ?? "this course"} />
              ) : lesson.hasVideo ? (
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <LessonPlayer
                      key={lesson.id}
                      ref={playerRef}
                      lessonId={lesson.id}
                      source={lesson.videoSource}
                      url={lesson.vimeoId ?? ""}
                      title={lesson.title}
                      initialPct={progressMap[lesson.id] ?? 0}
                      lastPosition={lesson.lastPosition ?? 0}
                      alreadyComplete={lessonDone}
                      onProgress={handleProgress}
                      onFirstPlay={() => void track("lesson_started", { lesson_id: lesson.id }, courseId)}
                      onAutoComplete={() => markComplete(lesson.id)}
                    />
                    {adOpen && ad && (
                      <AdOverlay assetUrl={ad.assetUrl} headline={ad.headline} ctaLabel={ad.ctaLabel} ctaUrl={ad.ctaUrl}
                        skippableAfterS={ad.skippableAfterS} onSkip={onAdSkip} onClose={closeAd}
                        onClick={onAdClick} />
                    )}
                  </div>
                  {/* Manual completion — universal (Phase 3): override for video lessons. */}
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-textSecondary">
                      {lessonDone ? "Lesson complete" : "Auto-completes at 70% watched"}
                    </span>
                    {lessonDone ? (
                      <span className="inline-flex items-center gap-1.5 text-success text-sm font-semibold"><IconCheckCircle size={16} /> Completed</span>
                    ) : (
                      <BtnSecondary onClick={() => markComplete(lesson.id)}><IconCheck size={15} /> Mark complete</BtnSecondary>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-subtle rounded-2xl p-10 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-promo text-primary flex items-center justify-center"><IconFileText size={22} /></div>
                  <div>
                    <div className="text-[15px] font-semibold text-textPrimary">This lesson has no video</div>
                    <p className="text-sm text-textSecondary mt-1 max-w-[360px]">Work through the materials below, then mark the lesson complete yourself.</p>
                  </div>
                  {lessonDone ? (
                    <div className="inline-flex items-center gap-2 text-success text-sm font-semibold"><IconCheckCircle size={17} /> Completed</div>
                  ) : (
                    <BtnPrimary onClick={() => markComplete(lesson.id)}><IconCheck size={16} /> Mark complete</BtnPrimary>
                  )}
                </div>
              )}

              {!courseComplete && (
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-textSecondary leading-[22px] max-w-[560px]">{lesson.description || DEFAULT_LESSON_DESC}</p>
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
                    {lesson.resources.map((r, i) => <ResourceRow key={(r.id ?? r.name) + ":" + i} resource={r} />)}
                  </div>
                </div>
              )}

              {/* dev-only ad-trigger hint (gated by ?dev=1) */}
              {dev && !courseComplete && lesson.hasVideo && (
                <div className="border-[1.5px] border-dashed border-canvasDeep rounded-2xl px-4 py-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-textSecondary">{ad ? `dev: live ad_rule — fires at ${ad.triggerType === "pct" ? ad.triggerValue + "%" : ad.triggerValue + "s"}` : "dev: no active ad rule for this lesson"}</span>
                  {ad && <button onClick={() => { setAdOpen(true); playerRef.current?.pause(); }} className="font-mono text-[11px] font-semibold text-primary underline">trigger ad now</button>}
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
