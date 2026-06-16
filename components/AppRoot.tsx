"use client";

// ============================================================
// AppRoot.tsx — ports the export's inline App() state machine.
// Screen state (no routing) mirrors the approved design 1:1. Dev affordances
// (TweaksPanel, login dev bar, in-course ad-trigger hint) are gated by ?dev=1.
// ============================================================

import { useState } from "react";
import { FIXTURES } from "@/lib/fixtures";
import { computeStats, initialProgress, moduleOf, type ProgressMap } from "@/lib/course";
import AppShell from "@/components/shell/AppShell";
import LoginScreen from "@/components/screens/LoginScreen";
import Dashboard from "@/components/screens/Dashboard";
import MyCourses from "@/components/screens/MyCourses";
import ResourcesScreen from "@/components/screens/ResourcesScreen";
import SettingsScreen from "@/components/screens/SettingsScreen";
import CourseView from "@/components/screens/CourseView";
import {
  TweakButton,
  TweakSection,
  TweakSelect,
  TweakSlider,
  TweakToggle,
  TweaksPanel,
  useTweaks,
} from "@/components/dev/Tweaks";
import type { UpsellConfig } from "@/lib/types";

const TWEAK_DEFAULTS = {
  upsellIntensity: "5",
  emptyCourses: false,
  simSeconds: 24,
};

type Screen = "login" | "dashboard" | "courses" | "resources" | "settings" | "course";

interface ShellProps {
  active: string;
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  backLabel?: string;
}

export default function AppRoot({ dev }: { dev: boolean }) {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState<Screen>("login");
  const [progressMap, setProgressMap] = useState<ProgressMap>(initialProgress);
  const [currentLessonId, setCurrentLessonId] = useState<string>(FIXTURES.courses[0].lastLessonId);
  const [adSignal, setAdSignal] = useState(0);

  const F = FIXTURES;
  const setLessonPct = (id: string, pct: number) => setProgressMap((m) => ({ ...m, [id]: pct }));

  const completeAll = () => {
    const m: ProgressMap = {};
    F.modules.forEach((mod) => mod.lessons.forEach((l) => { m[l.id] = 100; }));
    setProgressMap(m);
    setScreen("course");
  };
  const resetProgress = () => setProgressMap(initialProgress());

  const openLesson = (id: string) => { setCurrentLessonId(id); setScreen("course"); };
  const stats = computeStats(progressMap);

  // upsell config for dashboard (current module or tweak override)
  const curMod = moduleOf(currentLessonId) || F.modules[0];
  const upsellKey = String(t.upsellIntensity) !== "auto" ? String(t.upsellIntensity) : null;
  const dashUpsell: UpsellConfig | undefined = upsellKey
    ? Object.values(F.upsellConfig).find((u) => String(u.intensity) === upsellKey) || F.upsellConfig[F.upsellModuleMap[curMod.id]]
    : F.upsellConfig[F.upsellModuleMap[curMod.id]];

  function tweaksPanel() {
    if (!dev) return null;
    return (
      <TweaksPanel>
        <TweakSection label="Upsell panel" />
        <TweakSelect label="Intensity" value={String(t.upsellIntensity)}
          options={["auto", "1", "2", "4", "5"]} onChange={(v) => setTweak("upsellIntensity", v)} />
        <TweakSection label="Player" />
        <TweakSlider label="Demo video length" value={t.simSeconds} min={8} max={60} step={1} unit="s"
          onChange={(v) => setTweak("simSeconds", v)} />
        <TweakSection label="Demo state" />
        <TweakToggle label="Empty My Courses" value={t.emptyCourses} onChange={(v) => setTweak("emptyCourses", v)} />
        <TweakButton label="Go to Dashboard" onClick={() => setScreen("dashboard")} />
        <TweakButton label="Trigger pop-ad (S3)" onClick={() => { setScreen("course"); setAdSignal((n) => n + 1); }} />
        <TweakButton label="Complete course" onClick={completeAll} />
        <TweakButton label="Reset progress" onClick={resetProgress} />
      </TweaksPanel>
    );
  }

  // ---- Login is standalone (no shell) ----
  if (screen === "login") {
    return (
      <>
        <LoginScreen dev={dev} onLogin={() => setScreen("dashboard")} />
        {tweaksPanel()}
      </>
    );
  }

  // ---- Shell config per screen ----
  const shellProps: ShellProps = {
    dashboard: { active: "dashboard", title: "Welcome back, " + F.user.name.split(" ")[0], subtitle: "Pick up where you left off — " + stats.completed + " of " + stats.total + " lessons done." },
    courses: { active: "courses", title: "My Courses", subtitle: "Your enrolled programs." },
    resources: { active: "resources", title: "Resources", subtitle: null },
    settings: { active: "settings", title: "Settings", subtitle: null },
    course: { active: "courses", title: F.courses[0].title, onBack: () => setScreen("courses"), backLabel: "My Courses" },
  }[screen];

  return (
    <>
      <AppShell {...shellProps} onNav={(id) => setScreen(id as Screen)} onLogout={() => setScreen("login")}>
        {screen === "dashboard" && (
          <Dashboard progressMap={progressMap} currentLessonId={currentLessonId}
            onResume={() => setScreen("course")} onOpenLesson={openLesson}
            onOpenCourse={() => setScreen("course")} upsellConfig={dashUpsell} />
        )}
        {screen === "courses" && (
          <MyCourses progressMap={progressMap} emptyState={t.emptyCourses}
            onOpenCourse={() => setScreen("course")} />
        )}
        {screen === "resources" && <ResourcesScreen onOpenLesson={openLesson} />}
        {screen === "settings" && <SettingsScreen onLogout={() => setScreen("login")} />}
        {screen === "course" && (
          <CourseView progressMap={progressMap} setLessonPct={setLessonPct}
            currentLessonId={currentLessonId} setCurrentLessonId={setCurrentLessonId}
            onLogout={() => setScreen("login")} upsellOverride={String(t.upsellIntensity)}
            adSignal={adSignal} simSeconds={t.simSeconds} dev={dev} />
        )}
      </AppShell>
      {tweaksPanel()}
    </>
  );
}
