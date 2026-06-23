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

export function computeStats(modules: Module[], progressMap: ProgressMap): Stats {
  const ls = allLessons(modules);
  const total = ls.length;
  const completed = ls.filter((l) => (progressMap[l.id] ?? 0) >= 100).length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  let watchedMin = 0;
  ls.forEach((l) => {
    watchedMin += durMin(l) * ((progressMap[l.id] ?? 0) / 100);
  });
  watchedMin = Math.round(watchedMin);
  const wt =
    watchedMin >= 60
      ? Math.floor(watchedMin / 60) + "h " + (watchedMin % 60) + "m"
      : watchedMin + "m";
  return { total, completed, pct, watchTime: wt };
}

// Initial in-memory progress from the live tree (lesson.progress = pct).
export function initialProgress(modules: Module[]): ProgressMap {
  const map: ProgressMap = {};
  modules.forEach((m) => m.lessons.forEach((l) => { map[l.id] = l.progress; }));
  return map;
}

// "Continue" target: first not-completed lesson, else the first lesson.
export function resumeLessonId(modules: Module[], progressMap: ProgressMap): string {
  const ls = allLessons(modules);
  const next = ls.find((l) => (progressMap[l.id] ?? 0) < 100);
  return (next ?? ls[0])?.id ?? "";
}
