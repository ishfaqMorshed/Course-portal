"use client";

// ============================================================
// AppRoot.tsx — screen state machine (ported from the design export's App()).
// Phase 2.7-fix: auth-gated AND data-live. The course tree, progress, upsell,
// ad config and sidebar promo all come from the DB (props from the server page),
// not fixtures. Visual structure is unchanged. Dev affordances stay behind ?dev=1.
// ============================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { computeStats, initialProgress, moduleOf, resumeLessonId, type ProgressMap } from "@/lib/course";
import { resolveRailUpsell, resolveSidebarPromo } from "@/lib/portal-map";
import { createClient } from "@/lib/supabase/client";
import { CurrentUserProvider } from "@/lib/current-user";
import type { CurrentUser, EnrolledCourse } from "@/lib/queries";
import type { AdRuleRow, UpsellRow } from "@/lib/admin/types";
import type { Course, Module } from "@/lib/types";
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
  TweakSlider,
  TweakToggle,
  TweaksPanel,
  useTweaks,
} from "@/components/dev/Tweaks";

const TWEAK_DEFAULTS = {
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
  course = null,
  modules = [],
  upsells = [],
  adRules = [],
}: {
  dev: boolean;
  authed: boolean;
  initialUser?: CurrentUser | null;
  enrolledCourses?: EnrolledCourse[];
  course?: Course | null;
  modules?: Module[];
  upsells?: UpsellRow[];
  adRules?: AdRuleRow[];
}) {
  const router = useRouter();
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState<Screen>(authed ? "dashboard" : "login");
  const [progressMap, setProgressMap] = useState<ProgressMap>(() => initialProgress(modules));
  const [currentLessonId, setCurrentLessonId] = useState<string>(() =>
    resumeLessonId(modules, initialProgress(modules)),
  );
  const [adSignal, setAdSignal] = useState(0);

  const displayName = initialUser?.name ?? "Learner";
  const sidebarPromo = resolveSidebarPromo(upsells);
  const setLessonPct = (id: string, pct: number) => setProgressMap((m) => ({ ...m, [id]: pct }));

  const completeAll = () => {
    const m: ProgressMap = {};
    modules.forEach((mod) => mod.lessons.forEach((l) => { m[l.id] = 100; }));
    setProgressMap(m);
    setScreen("course");
  };
  const resetProgress = () => setProgressMap(initialProgress(modules));
  const openLesson = (id: string) => { setCurrentLessonId(id); setScreen("course"); };
  const stats = computeStats(modules, progressMap);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh(); // re-run the server gate → unauthenticated → login
  };

  // rail upsell for the dashboard (current module) — live upsell_config
  const curMod = moduleOf(modules, currentLessonId) || modules[0];
  const dashUpsell = curMod ? resolveRailUpsell(upsells, curMod.id) : undefined;

  function tweaksPanel() {
    if (!dev) return null;
    return (
      <TweaksPanel>
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

  // ---- Not authenticated → login only ----
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
    course: { active: "courses", title: course?.title ?? "Course", onBack: () => setScreen("courses"), backLabel: "My Courses" },
  }[screen as Exclude<Screen, "login">];

  return (
    <CurrentUserProvider value={initialUser ?? null}>
      <AppShell {...shellProps} onNav={(id) => setScreen(id as Screen)} onLogout={logout} sidebarPromo={sidebarPromo}>
        {screen === "dashboard" && (
          <Dashboard modules={modules} course={course} progressMap={progressMap} currentLessonId={currentLessonId}
            onResume={() => setScreen("course")} onOpenLesson={openLesson}
            onOpenCourse={() => setScreen("course")} upsellConfig={dashUpsell} />
        )}
        {screen === "courses" && (
          <MyCourses enrolledCourses={enrolledCourses} emptyStateOverride={t.emptyCourses}
            onOpenCourse={() => setScreen("course")} />
        )}
        {screen === "resources" && <ResourcesScreen modules={modules} onOpenLesson={openLesson} />}
        {screen === "settings" && <SettingsScreen onLogout={logout} />}
        {screen === "course" && (
          <CourseView modules={modules} course={course} upsells={upsells} adRules={adRules}
            progressMap={progressMap} setLessonPct={setLessonPct}
            currentLessonId={currentLessonId} setCurrentLessonId={setCurrentLessonId}
            onLogout={logout} adSignal={adSignal} simSeconds={t.simSeconds} dev={dev} />
        )}
      </AppShell>
      {tweaksPanel()}
    </CurrentUserProvider>
  );
}
