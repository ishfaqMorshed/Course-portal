// ============================================================
// course.ts — pure helpers over the fixtures (ported from screens.jsx).
// ============================================================

import { FIXTURES } from "./fixtures";
import type { Lesson, Module, ProgressMap } from "./types";

export type { ProgressMap } from "./types";

export function allLessons(): Lesson[] {
  return FIXTURES.modules.flatMap((m) => m.lessons);
}

export function findLesson(id: string): Lesson | undefined {
  return allLessons().find((l) => l.id === id);
}

export function moduleOf(lessonId: string): Module | undefined {
  return FIXTURES.modules.find((m) => m.lessons.some((l) => l.id === lessonId));
}

export function nextLessonId(lessonId: string): string | null {
  const ls = allLessons();
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

export function computeStats(progressMap: ProgressMap): Stats {
  const ls = allLessons();
  const total = ls.length;
  const completed = ls.filter((l) => (progressMap[l.id] ?? 0) >= 100).length;
  const pct = Math.round((completed / total) * 100);
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

export function initialProgress(): ProgressMap {
  const map: ProgressMap = {};
  FIXTURES.modules.forEach((m) =>
    m.lessons.forEach((l) => {
      map[l.id] = l.progress;
    }),
  );
  return map;
}
