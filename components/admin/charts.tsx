"use client";

// Phase 7 step 2 — recharts wrappers for the admin analytics page. Each takes the
// raw RPC arrays (lib/admin/analytics) and shapes them internally so the page
// stays declarative. Read-only presentation; no data fetching here.

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EngagementCount, LessonCompletion, SegmentCount } from "@/lib/admin/analytics";

const PALETTE = ["#5A60EA", "#8B8FF0", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#BDBFF7"];

// The five live segments (+ dormant dfy) in a stable display order/label.
const SEGMENT_LABEL: Record<string, string> = {
  never_activated: "Never activated",
  not_started: "Not started",
  active: "Active",
  stalled: "Stalled",
  completer: "Completer",
  dfy_purchased: "DFY purchased",
};
const SEGMENT_COLOR: Record<string, string> = {
  never_activated: "#94A3B8",
  not_started: "#8B8FF0",
  active: "#22C55E",
  stalled: "#F59E0B",
  completer: "#5A60EA",
  dfy_purchased: "#06B6D4",
};
const SEGMENT_ORDER = Object.keys(SEGMENT_LABEL);

function Empty({ label }: { label: string }) {
  return <div className="h-[260px] flex items-center justify-center text-sm text-textSecondary">{label}</div>;
}

export function SegmentDonut({ data }: { data: SegmentCount[] }) {
  const rows = [...data]
    .filter((d) => Number(d.n) > 0)
    .sort((a, b) => SEGMENT_ORDER.indexOf(a.segment) - SEGMENT_ORDER.indexOf(b.segment))
    .map((d) => ({ name: SEGMENT_LABEL[d.segment] ?? d.segment, value: Number(d.n), key: d.segment }));
  if (rows.length === 0) return <Empty label="No segment data yet." />;
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={rows} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
            {rows.map((r, i) => <Cell key={r.key} fill={SEGMENT_COLOR[r.key] ?? PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const PLACEMENT_LABEL: Record<string, string> = {
  rail: "Rail",
  sidebar_promo: "Sidebar",
  completion: "Completion",
};

// Upsell views vs clicks, grouped by placement.
export function UpsellBar({ data }: { data: EngagementCount[] }) {
  const byPlacement = new Map<string, { placement: string; Views: number; Clicks: number }>();
  for (const d of data) {
    if (d.type !== "upsell_view" && d.type !== "upsell_click") continue;
    const key = d.placement ?? "unknown";
    const row = byPlacement.get(key) ?? { placement: PLACEMENT_LABEL[key] ?? key, Views: 0, Clicks: 0 };
    if (d.type === "upsell_view") row.Views += Number(d.n);
    else row.Clicks += Number(d.n);
    byPlacement.set(key, row);
  }
  const rows = Array.from(byPlacement.values());
  if (rows.length === 0) return <Empty label="No upsell engagement yet." />;
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="placement" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="Views" fill="#8B8FF0" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Clicks" fill="#5A60EA" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Ad views / skips / clicks (totals across placements).
export function AdBar({ data }: { data: EngagementCount[] }) {
  const totals: Record<string, number> = { ad_view: 0, ad_skip: 0, ad_click: 0 };
  for (const d of data) if (d.type in totals) totals[d.type] += Number(d.n);
  const rows = [
    { name: "Views", value: totals.ad_view },
    { name: "Skips", value: totals.ad_skip },
    { name: "Clicks", value: totals.ad_click },
  ];
  if (rows.every((r) => r.value === 0)) return <Empty label="No ad engagement yet." />;
  return (
    <div className="h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar dataKey="value" name="Events" radius={[4, 4, 0, 0]}>
            {rows.map((r, i) => <Cell key={r.name} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Lesson completion counts per lesson.
export function CompletionsBar({ data }: { data: LessonCompletion[] }) {
  const rows = data.map((d) => ({ name: d.lesson_title, value: Number(d.n) }));
  if (rows.length === 0) return <Empty label="No lesson completions yet." />;
  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="value" name="Completions" fill="#5A60EA" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
