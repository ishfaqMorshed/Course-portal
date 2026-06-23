"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, ErrorText, PageHeader, Select, TextInput } from "@/components/admin/ui";
import {
  getStudentEvents,
  getStudents,
  type StudentEvent,
  type StudentRow,
} from "@/lib/admin/analytics";

const SEGMENT_LABEL: Record<string, string> = {
  never_activated: "Never activated",
  not_started: "Not started",
  active: "Active",
  stalled: "Stalled",
  completer: "Completer",
  dfy_purchased: "DFY purchased",
};

function fmtDate(s: string | null): string {
  if (!s) return "—";
  return new Date(s).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function SegmentTag({ segment }: { segment: string | null }) {
  if (!segment) return <span className="text-textSecondary">—</span>;
  return (
    <span className="inline-flex items-center rounded-full bg-subtle px-2.5 py-0.5 text-[12px] font-medium text-textPrimary">
      {SEGMENT_LABEL[segment] ?? segment}
    </span>
  );
}

// Per-student event drill — fetched on open (admin_student_events).
function StudentDrawer({ student, onClose }: { student: StudentRow; onClose: () => void }) {
  const [events, setEvents] = useState<StudentEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setEvents(await getStudentEvents(student.user_id));
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [student.user_id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md h-full bg-white shadow-card overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-line px-5 py-4 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-bold text-textPrimary truncate">{student.email}</div>
            <div className="text-[12px] text-textSecondary">Activity (most recent 200 events)</div>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
        <div className="p-5">
          <ErrorText message={error} />
          {!events && !error && <p className="text-sm text-textSecondary">Loading…</p>}
          {events && events.length === 0 && <p className="text-sm text-textSecondary">No events recorded.</p>}
          {events && events.length > 0 && (
            <ul className="flex flex-col gap-2">
              {events.map((ev, i) => (
                <li key={i} className="border border-line rounded-card px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] font-semibold text-textPrimary">{ev.type}</span>
                    <span className="text-[11px] text-textSecondary whitespace-nowrap">
                      {new Date(ev.created_at).toLocaleString()}
                    </span>
                  </div>
                  {ev.payload && Object.keys(ev.payload).length > 0 && (
                    <pre className="mt-1 text-[11px] text-textSecondary font-mono whitespace-pre-wrap break-all">
                      {JSON.stringify(ev.payload)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setRows(await getStudents());
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Segments actually present, for the filter dropdown.
  const segmentsPresent = useMemo(
    () => Array.from(new Set(rows.map((r) => r.segment).filter(Boolean) as string[])),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (segment === "all" || r.segment === segment) &&
        (q === "" || r.email.toLowerCase().includes(q)),
    );
  }, [rows, segment, query]);

  const emails = filtered.map((r) => r.email);

  const copyEmails = async () => {
    try {
      await navigator.clipboard.writeText(emails.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const downloadCsv = () => {
    const csv = "email\n" + emails.map((e) => `"${e.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${segment}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Students" subtitle="Enrolled students with progress and segment — filter, search, export for outreach." />

      <Card className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <label className="block">
            <span className="block text-[13px] font-semibold text-textPrimary mb-1.5">Segment</span>
            <Select value={segment} onChange={(e) => setSegment(e.target.value)} className="w-56">
              <option value="all">All segments</option>
              {segmentsPresent.map((s) => <option key={s} value={s}>{SEGMENT_LABEL[s] ?? s}</option>)}
            </Select>
          </label>
          <label className="block flex-1">
            <span className="block text-[13px] font-semibold text-textPrimary mb-1.5">Search email</span>
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="name@example.com" />
          </label>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={copyEmails} disabled={emails.length === 0}>
              {copied ? "Copied!" : `Copy ${emails.length} emails`}
            </Button>
            <Button onClick={downloadCsv} disabled={emails.length === 0}>Download CSV</Button>
          </div>
        </div>
      </Card>

      <ErrorText message={error} />

      {loading ? (
        <p className="text-sm text-textSecondary">Loading…</p>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[12px] font-semibold uppercase tracking-wide text-textSecondary">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Segment</th>
                  <th className="px-4 py-3">Lessons</th>
                  <th className="px-4 py-3">Last active</th>
                  <th className="px-4 py-3">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-textSecondary">No students match.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.user_id} className="border-b border-line last:border-b-0 hover:bg-subtle/60 cursor-pointer" onClick={() => setSelected(r)}>
                    <td className="px-4 py-3 font-medium text-textPrimary">{r.email}</td>
                    <td className="px-4 py-3"><SegmentTag segment={r.segment} /></td>
                    <td className="px-4 py-3 text-textSecondary">{r.completed_lessons}/{r.total_lessons}</td>
                    <td className="px-4 py-3 text-textSecondary">{fmtDate(r.last_active)}</td>
                    <td className="px-4 py-3 text-textSecondary">{fmtDate(r.enrolled_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && <StudentDrawer student={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
