"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/admin/ui";
import { listCourses } from "@/lib/admin/queries";
import type { CourseRow } from "@/lib/admin/types";

// Shared per-course config pages select a course first. Returns the chosen
// course id + a ready-to-render <select>.
export function useCoursePicker() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const cs = await listCourses();
        setCourses(cs);
        if (cs[0]) setCourseId(cs[0].id);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, []);

  const picker = (
    <div className="flex items-center gap-2">
      <span className="text-[13px] font-semibold text-textPrimary">Course</span>
      <Select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-72">
        {courses.length === 0 && <option value="">No courses</option>}
        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </Select>
    </div>
  );

  return { courseId, courses, picker, pickerError: error };
}
