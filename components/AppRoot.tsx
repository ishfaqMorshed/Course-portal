"use client";

// ============================================================
// AppRoot.tsx — screen state machine (ported from the design export's App()).
// Phase 2: auth-gated. When authed, starts on the dashboard and renders the
// shell; My Courses + the shell identity come from real data. Dashboard /
// CourseView / Resources remain on fixtures (Phase 2 = EXIT-minimal reads).
// Dev affordances stay behind ?dev=1.
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FIXTURES } from "@/lib/fixtures";
import { computeStats, initialProgress, moduleOf, type ProgressMap } from "@/lib/course";
import { createClient } from "@/lib/supabase/client";
import { CurrentUserProvider } from "@/lib/current-user";
import type { CurrentUser, EnrolledCourse } from "@/lib/queries";
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

export default function AppRoot({
  dev,
  authed,
  initialUser,
  enrolledCourses = [],
}: {
  dev: boolean;
  authed: boolean;
  initialUser?: CurrentUser | null;
  enrolledCourses?: EnrolledCourse[];
}) {
  const router = useRouter();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState<Screen>(authed ? "dashboard" : "login");
  const [progressMap, setProgressMap] = useState<ProgressMap>(initialProgress);
  const [currentLessonId, setCurrentLessonId] = useState<string>(FIXTURES.courses[0].lastLessonId);
  const [adSignal, setAdSignal] = useState(0);

  const F = FIXTURES;
  const displayName = initialUser?.name ?? F.user.name;
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

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh(); // re-run the server gate → unauthenticated → login
  };

  // upsell config for dashboard (current module or tweak override) — still fixtures
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

  // ---- Not authenticated → login only (real magic-link auth) ----
  if (!authed) {
    return (
      <CurrentUserProvider value={initialUser ?? null}>
        <LoginScreen dev={dev} />
        {tweaksPanel()}
      </CurrentUserProvider>
    );
  }

  // ---- Shell config per screen ----
  const shellProps: ShellProps = {
    dashboard: { active: "dashboard", title: "Welcome back, " + displayName.split(" ")[0], subtitle: "Pick up where you left off — " + stats.completed + " of " + stats.total + " lessons done." },
    courses: { active: "courses", title: "My Courses", subtitle: "Your enrolled programs." },
    resources: { active: "resources", title: "Resources", subtitle: null },
    settings: { active: "settings", title: "Settings", subtitle: null },
    course: { active: "courses", title: F.courses[0].title, onBack: () => setScreen("courses"), backLabel: "My Courses" },
  }[screen as Exclude<Screen, "login">];

  return (
    <CurrentUserProvider value={initialUser ?? null}>
      <AppShell {...shellProps} onNav={(id) => setScreen(id as Screen)} onLogout={logout}>
        {screen === "dashboard" && (
          <Dashboard progressMap={progressMap} currentLessonId={currentLessonId}
            onResume={() => setScreen("course")} onOpenLesson={openLesson}
            onOpenCourse={() => setScreen("course")} upsellConfig={dashUpsell} />
        )}
        {screen === "courses" && (
          <MyCourses enrolledCourses={enrolledCourses} emptyStateOverride={t.emptyCourses}
            onOpenCourse={() => setScreen("course")} />
        )}
        {screen === "resources" && <ResourcesScreen onOpenLesson={openLesson} />}
        {screen === "settings" && <SettingsScreen onLogout={logout} />}
        {screen === "course" && (
          <CourseView progressMap={progressMap} setLessonPct={setLessonPct}
            currentLessonId={currentLessonId} setCurrentLessonId={setCurrentLessonId}
            onLogout={logout} upsellOverride={String(t.upsellIntensity)}
            adSignal={adSignal} simSeconds={t.simSeconds} dev={dev} />
        )}
      </AppShell>
      {tweaksPanel()}
    </CurrentUserProvider>
  );
}
