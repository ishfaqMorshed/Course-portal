"use client";

import Placeholder from "@/components/ui/Placeholder";
import { IconCheck, IconPlay } from "@/components/icons";
import type { Lesson } from "@/lib/types";

// Reference "All Lessons" thumbnail card.
export default function LessonThumbCard({
  lesson,
  onClick,
  progress = 0,
  width,
}: {
  lesson: Lesson;
  onClick?: () => void;
  progress?: number;
  width?: number;
}) {
  const done = progress >= 100;
  return (
    <button onClick={onClick} style={width ? { width } : undefined} className="group text-left shrink-0 flex flex-col gap-2.5">
      <div className="relative rounded-[14px] overflow-hidden aspect-[16/10]">
        <Placeholder label={lesson.thumbLabel || "lesson thumb"} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent"></div>
        {/* duration chip top-left */}
        <span className="absolute top-2.5 left-2.5 bg-black/55 text-white text-[11px] font-medium rounded-full px-2.5 py-1">{lesson.duration}</span>
        {/* play / done top-right */}
        <span className={"absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 " + (done ? "bg-success text-white" : "bg-white/85 text-primary")}>
          {done ? <IconCheck size={16} strokeWidth={2.5} /> : <IconPlay size={14} className="ml-0.5" />}
        </span>
        {progress > 0 && progress < 100 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/30"><div className="h-full bg-primary" style={{ width: progress + "%" }}></div></div>
        )}
      </div>
      <div className="text-[13px] font-semibold text-textPrimary leading-snug group-hover:text-primary transition-colors line-clamp-2">{lesson.title}</div>
    </button>
  );
}
