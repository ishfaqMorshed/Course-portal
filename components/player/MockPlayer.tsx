"use client";

import { useEffect, useRef, useState } from "react";
import Placeholder from "@/components/ui/Placeholder";
import { FIXTURES } from "@/lib/fixtures";
import {
  IconCheck,
  IconMaximize,
  IconPause,
  IconPlay,
  IconRotateCcw,
  IconVolume,
} from "@/components/icons";
import type { Lesson } from "@/lib/types";

const F = FIXTURES;

// Mock Vimeo player — Phase 1.5 simulation only (real @vimeo/player wiring is
// Phase 3, CONNECTION-MAP §3). Drives pct over `simSeconds` and fires the ad
// rule at its trigger pct, mirroring the real timeupdate loop's behaviour.
export default function MockPlayer({
  lesson,
  pct,
  onPctChange,
  adOpen,
  onAdTrigger,
  adAlreadyShown,
  simSeconds = 24,
}: {
  lesson: Lesson;
  pct: number;
  onPctChange: (pct: number) => void;
  adOpen: boolean;
  onAdTrigger: () => void;
  adAlreadyShown: boolean;
  simSeconds?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const pctRef = useRef(pct);
  pctRef.current = pct;
  const durationS = lesson.duration.includes("min") ? parseInt(lesson.duration) * 60 : 600;
  useEffect(() => { if (adOpen) setPlaying(false); }, [adOpen]);
  useEffect(() => { setPlaying(false); }, [lesson.id]);
  useEffect(() => {
    if (!playing) return;
    const stepMs = 150;
    const step = 100 / ((simSeconds * 1000) / stepMs);
    const t = setInterval(() => {
      const prev = pctRef.current;
      let next = Math.min(100, prev + step);
      const trig = F.adRule.triggerAtPct;
      if (!adAlreadyShown && prev < trig && next >= trig) {
        next = trig; onPctChange(next); setPlaying(false); onAdTrigger(); return;
      }
      onPctChange(next);
      if (next >= 100) setPlaying(false);
    }, stepMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, adAlreadyShown, simSeconds, lesson.id]);
  const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  const curS = (pct / 100) * durationS;
  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const p = ((e.clientX - rect.left) / rect.width) * 100;
    onPctChange(Math.min(100, Math.max(0, p)));
  };
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden select-none" data-comment-anchor="video-player">
      <Placeholder label={"vimeo embed — " + lesson.title} className="absolute inset-0" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent pointer-events-none"></div>
      <div className="absolute top-5 left-6 pointer-events-none">
        <div className="text-white font-semibold text-lg leading-tight drop-shadow-sm">{lesson.title}</div>
        <div className="text-white/70 text-xs mt-0.5">{lesson.duration}</div>
      </div>
      {!playing && pct < 100 && (
        <button onClick={() => setPlaying(true)} className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/85 hover:bg-white text-primary flex items-center justify-center shadow-card transition-transform hover:scale-105" title="Play">
          <IconPlay size={24} className="ml-1" />
        </button>
      )}
      {pct >= 100 && !playing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/30">
          <div className="w-14 h-14 rounded-full bg-success text-white flex items-center justify-center"><IconCheck size={26} strokeWidth={2} /></div>
          <span className="text-white text-sm font-semibold drop-shadow">Lesson complete</span>
          <button onClick={() => { onPctChange(0); setPlaying(true); }} className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-medium"><IconRotateCcw size={13} /> Rewatch</button>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 px-5 pb-4 pt-10 bg-gradient-to-t from-black/55 to-transparent">
        <div className="flex items-center gap-3.5 text-white">
          <button onClick={() => setPlaying(!playing)} className="hover:text-white/80" title={playing ? "Pause" : "Play"}>{playing ? <IconPause size={18} /> : <IconPlay size={18} />}</button>
          <span className="text-[11px] tabular-nums text-white/80 w-9">{fmt(curS)}</span>
          <div className="flex-1 h-4 flex items-center cursor-pointer group" onClick={seek}>
            <div className="w-full h-1 rounded-full bg-white/30 relative">
              <div className="h-full rounded-full bg-white relative" style={{ width: pct + "%" }}>
                <div className="absolute -right-1.5 -top-1 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100"></div>
              </div>
            </div>
          </div>
          <span className="text-[11px] tabular-nums text-white/80 w-9 text-right">{fmt(durationS)}</span>
          <button className="hover:text-white/80" title="Volume"><IconVolume size={17} /></button>
          <button className="hover:text-white/80" title="Fullscreen"><IconMaximize size={16} /></button>
        </div>
      </div>
    </div>
  );
}
