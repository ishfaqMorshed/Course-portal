"use client";

import { FIXTURES } from "@/lib/fixtures";
import { allLessons, computeStats, findLesson, moduleOf } from "@/lib/course";
import Placeholder from "@/components/ui/Placeholder";
import ProgressPill from "@/components/ui/ProgressPill";
import { BtnPrimary } from "@/components/ui/Buttons";
import LessonThumbCard from "@/components/ui/LessonThumbCard";
import ScrollRow from "@/components/ui/ScrollRow";
import StatCard from "@/components/ui/StatCard";
import ModuleProgressRail from "@/components/ui/ModuleProgressRail";
import UpsellPanel from "@/components/upsell/UpsellPanel";
import { IconCheckCircle, IconClock, IconPlay, IconTrendUp } from "@/components/icons";
import type { Course, Lesson, ProgressMap, UpsellConfig } from "@/lib/types";

const FX = FIXTURES;

function HeroCard({ lesson, course, progress, onResume }: { lesson: Lesson; course: Course; progress: number; onResume: () => void }) {
  return (
    <div className="bg-white border border-line rounded-2xl shadow-card overflow-hidden flex flex-col sm:flex-row">
      <div className="sm:w-[42%] shrink-0 relative">
        <Placeholder label={lesson.thumbLabel || "lesson thumbnail"} className="h-44 sm:h-full min-h-[180px]" />
        <span className="absolute top-3 left-3 bg-black/55 text-white text-[11px] font-medium rounded-full px-2.5 py-1 whitespace-nowrap">{lesson.duration}</span>
      </div>
      <div className="flex-1 p-6 flex flex-col">
        <div className="text-xs font-semibold uppercase tracking-wide text-primary">Continue learning</div>
        <h3 className="text-xl font-bold text-textPrimary leading-7 mt-2">{lesson.title}</h3>
        <p className="text-sm text-textSecondary mt-1">{course.title} · {moduleOf(lesson.id)?.title}</p>
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between text-xs text-textSecondary mb-2">
            <span>{Math.round(progress)}% watched</span>
            <span>{lesson.duration}</span>
          </div>
          <ProgressPill pct={progress} className="mb-4" />
          <BtnPrimary onClick={onResume}><IconPlay size={15} /> Resume Lesson</BtnPrimary>
        </div>
      </div>
    </div>
  );
}

// S2a — Dashboard (default after login).
export default function Dashboard({
  progressMap,
  currentLessonId,
  onResume,
  onOpenLesson,
  onOpenCourse,
  upsellConfig,
}: {
  progressMap: ProgressMap;
  currentLessonId: string;
  onResume: () => void;
  onOpenLesson: (id: string) => void;
  onOpenCourse: () => void;
  upsellConfig?: UpsellConfig;
}) {
  const stats = computeStats(progressMap);
  const course = FX.courses[0];
  const resumeLesson = findLesson(currentLessonId) || allLessons()[0];
  const currentMod = moduleOf(resumeLesson.id)!;

  // up-next: next not-completed lessons after current
  const ls = allLessons();
  const upNext = ls.filter((l) => (progressMap[l.id] ?? 0) < 100).slice(0, 6);

  return (
    <div className="px-6 lg:px-9 py-7">
      <div className="flex flex-col xl:flex-row gap-7">
        {/* main column */}
        <div className="flex-1 min-w-0 flex flex-col gap-7">
          <HeroCard lesson={resumeLesson} course={course} progress={progressMap[resumeLesson.id] ?? 0} onResume={onResume} />

          {/* stats row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={<IconCheckCircle size={22} />} value={stats.completed + "/" + stats.total} label="Lessons completed" />
            <StatCard icon={<IconTrendUp size={22} />} value={stats.pct + "%"} label="Course progress" accent="bg-promo text-primary" />
            <StatCard icon={<IconClock size={22} />} value={stats.watchTime} label="Watch time" accent="bg-subtle text-primary" />
          </div>

          {/* up next */}
          <ScrollRow label="Up next">
            {upNext.map((l) => (
              <LessonThumbCard key={l.id} lesson={l} width={210} progress={progressMap[l.id] ?? 0} onClick={() => onOpenLesson(l.id)} />
            ))}
          </ScrollRow>
        </div>

        {/* right rail */}
        <aside className="w-full xl:w-[320px] shrink-0 flex flex-col gap-5">
          <ModuleProgressRail modules={FX.modules} progressMap={progressMap} currentModuleId={currentMod.id} pctTotal={stats.pct}
            onSelectModule={(m) => onOpenLesson(m.lessons[0].id)} />
          <UpsellPanel config={upsellConfig} />
        </aside>
      </div>
    </div>
  );
}
