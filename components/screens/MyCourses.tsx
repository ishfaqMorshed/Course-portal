"use client";

import Placeholder from "@/components/ui/Placeholder";
import ProgressPill from "@/components/ui/ProgressPill";
import { BtnPrimary } from "@/components/ui/Buttons";
import { IconArrowRight, IconBookOpen } from "@/components/icons";
import type { EnrolledCourse } from "@/lib/queries";

// S2b — My Courses (left-aligned grid in shell). Phase 2: real enrolled courses
// from get_enrolled_courses(). Visual structure unchanged from the design export.
export default function MyCourses({
  enrolledCourses,
  onOpenCourse,
  emptyStateOverride,
}: {
  enrolledCourses: EnrolledCourse[];
  onOpenCourse: (c: EnrolledCourse) => void;
  emptyStateOverride: boolean;
}) {
  const empty = emptyStateOverride || enrolledCourses.length === 0;
  return (
    <div className="px-6 lg:px-9 py-7">
      {empty ? (
        <div className="border-[1.5px] border-dashed border-canvasDeep rounded-2xl p-12 flex flex-col items-center text-center gap-3 max-w-[520px]">
          <div className="w-12 h-12 rounded-full bg-subtle text-textSecondary flex items-center justify-center"><IconBookOpen size={22} /></div>
          <div className="text-[15px] font-semibold text-textPrimary">No courses yet</div>
          <p className="text-sm text-textSecondary max-w-[340px]">Your enrollments will show up here. If you just bought a course, give it a minute — or check that you logged in with your purchase email.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1000px]">
          {enrolledCourses.map((c) => (
            <div key={c.id} className="bg-white border border-line rounded-2xl shadow-card overflow-hidden flex flex-col">
              <Placeholder label="course cover" className="aspect-[16/9]" />
              <div className="p-5 flex flex-col gap-4 flex-1">
                <div>
                  <h3 className="text-[15px] font-semibold text-textPrimary leading-snug">{c.title}</h3>
                </div>
                <div className="mt-auto flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs text-textSecondary">
                    <span>{c.completedLessons} of {c.totalLessons} lessons</span>
                    <span className="font-semibold text-textPrimary">{c.pct}%</span>
                  </div>
                  <ProgressPill pct={c.pct} />
                  <BtnPrimary onClick={() => onOpenCourse(c)} className="w-full mt-2">
                    {c.pct === 0 ? "Start course" : c.pct >= 100 ? "Review course" : "Continue"} <IconArrowRight size={16} />
                  </BtnPrimary>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
