// ============================================================
// course.ts — pure helpers over a course tree (Module[]). Phase 2.7-fix: these
// no longer read FIXTURES; the live tree comes from get_course_tree and is
// passed in by the caller (AppRoot threads it to Dashboard/CourseView).
// ============================================================

import type { Lesson, Module, ProgressMap } from "./types";

export type { ProgressMap } from "./types";

export function allLessons(modules: Module[]): Lesson[] {
  return modules.flatMap((m) => m.lessons);
}

export function findLesson(modules: Module[], id: string): Lesson | undefined {
  return allLessons(modules).find((l) => l.id === id);
}

export function moduleOf(modules: Module[], lessonId: string): Module | undefined {
  return modules.find((m) => m.lessons.some((l) => l.id === lessonId));
}

export function nextLessonId(modules: Module[], lessonId: string): string | null {
  const ls = allLessons(modules);
  const i = ls.findIndex((l) => l.id === lessonId);
  return i >= 0 && i < ls.length - 1 ? ls[i + 1].id : null;
}

export function durMin(l: Lesson): number {
  return l.duration.includes("min") ? parseInt(l.duration) : 0;
}

export interface Stats {
  total: number;
  completed: number;
  pct: number;
  watchTime: string;
}

// Phase 3 completion model: "done" comes from the completedSet (a lesson can be
// complete at 70% watched), NOT from pct >= 100. pct (progressMap) drives the
// watch-progress bars only. Watch time sums durations of completed lessons
// (duration has no DB column yet, so this stays ~0 until that lands — noted).
export function computeStats(modules: Module[], completed: Set<string>): Stats {
  const ls = allLessons(modules);
  const total = ls.length;
  const done = ls.filter((l) => completed.has(l.id));
  const completedCount = done.length;
  const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const watchedMin = Math.round(done.reduce((sum, l) => sum + durMin(l), 0));
  const wt =
    watchedMin >= 60
      ? Math.floor(watchedMin / 60) + "h " + (watchedMin % 60) + "m"
      : watchedMin + "m";
  return { total, completed: completedCount, pct, watchTime: wt };
}

// Initial in-memory watched-pct from the live tree (lesson.progress = pct).
export function initialProgress(modules: Module[]): ProgressMap {
  const map: ProgressMap = {};
  modules.forEach((m) => m.lessons.forEach((l) => { map[l.id] = l.progress; }));
  return map;
}

// Initial completed set from the live tree (lesson.completed = completed_at != null).
export function initialCompleted(modules: Module[]): Set<string> {
  const set = new Set<string>();
  modules.forEach((m) => m.lessons.forEach((l) => { if (l.completed) set.add(l.id); }));
  return set;
}

// "Continue" target: first not-completed lesson, else the first lesson.
export function resumeLessonId(modules: Module[], completed: Set<string>): string {
  const ls = allLessons(modules);
  const next = ls.find((l) => !completed.has(l.id));
  return (next ?? ls[0])?.id ?? "";
}
