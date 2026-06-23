"use client";

import { useEffect, useState } from "react";
import { Card, ErrorText, PageHeader } from "@/components/admin/ui";
import { AdBar, CompletionsBar, SegmentDonut, UpsellBar } from "@/components/admin/charts";
import {
  getEngagementCounts,
  getKpis,
  getLessonCompletions,
  getSegmentCounts,
  PRICE_PER_ENROLLMENT,
  type AdminKpis,
  type EngagementCount,
  type LessonCompletion,
  type SegmentCount,
} from "@/lib/admin/analytics";

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-textSecondary">{label}</div>
      <div className="text-2xl font-bold text-textPrimary mt-1.5">{value}</div>
      {sub && <div className="text-[12px] text-textSecondary mt-1">{sub}</div>}
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h3 className="text-sm font-bold text-textPrimary mb-3">{title}</h3>
      {children}
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  const [kpis, setKpis] = useState<AdminKpis | null>(null);
  const [segments, setSegments] = useState<SegmentCount[]>([]);
  const [engagement, setEngagement] = useState<EngagementCount[]>([]);
  const [completions, setCompletions] = useState<LessonCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [k, s, e, c] = await Promise.all([
          getKpis(),
          getSegmentCounts(),
          getEngagementCounts(),
          getLessonCompletions(),
        ]);
        setKpis(k);
        setSegments(s);
        setEngagement(e);
        setCompletions(c);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const segOf = (name: string) => Number(segments.find((s) => s.segment === name)?.n ?? 0);
  const revenue = kpis ? kpis.total_enrollments * PRICE_PER_ENROLLMENT : 0;
  const completionRate =
    kpis && kpis.total_students > 0 ? Math.round((kpis.course_completions / kpis.total_students) * 100) : 0;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Revenue, engagement, and segment overview — read-only from live data." />
      <ErrorText message={error} />

      {loading ? (
        <p className="text-sm text-textSecondary">Loading…</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <Metric label="Revenue" value={`$${revenue.toLocaleString()}`} sub={`${kpis?.total_enrollments ?? 0} × $${PRICE_PER_ENROLLMENT}`} />
            <Metric label="Students" value={String(kpis?.total_students ?? 0)} />
            <Metric label="Enrollments" value={String(kpis?.total_enrollments ?? 0)} />
            <Metric label="Completions" value={String(kpis?.lesson_completions ?? 0)} sub="lessons completed" />
            <Metric label="Completion rate" value={`${completionRate}%`} sub={`${kpis?.course_completions ?? 0} finished course`} />
            <Metric label="Active / Stalled" value={`${segOf("active")} / ${segOf("stalled")}`} />
          </div>

          {/* charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Students by segment"><SegmentDonut data={segments} /></ChartCard>
            <ChartCard title="Upsell engagement (by placement)"><UpsellBar data={engagement} /></ChartCard>
            <ChartCard title="Ad engagement"><AdBar data={engagement} /></ChartCard>
            <ChartCard title="Lesson completions"><CompletionsBar data={completions} /></ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}
