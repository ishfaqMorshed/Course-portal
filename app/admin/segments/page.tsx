"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorText, Field, PageHeader, TextInput } from "@/components/admin/ui";
import { useCoursePicker } from "@/components/admin/useCoursePicker";
import { getSegmentConfig, upsertSegmentConfig } from "@/lib/admin/queries";

export default function AdminSegmentsPage() {
  const { courseId, picker, pickerError } = useCoursePicker();
  const [stalled, setStalled] = useState<number>(14);
  const [neverActivated, setNeverActivated] = useState<number>(7);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    setSaved(false);
    (async () => {
      try {
        const cfg = await getSegmentConfig(courseId);
        setStalled(cfg?.stalled_after_days ?? 14);
        setNeverActivated(cfg?.never_activated_after_days ?? 7);
        setError(null);
      } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    })();
  }, [courseId]);

  const save = async () => {
    if (!courseId) return;
    setBusy(true);
    setSaved(false);
    try {
      await upsertSegmentConfig({
        course_id: courseId,
        stalled_after_days: Number(stalled),
        never_activated_after_days: Number(neverActivated),
      });
      setSaved(true);
      setError(null);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Segment thresholds" subtitle="Day thresholds the daily segment job (Phase 4) reads per course." />
      <div className="mb-5">{picker}</div>
      <ErrorText message={pickerError ?? error} />
      {loading ? <p className="text-sm text-textSecondary">Loading…</p> : (
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Stalled after (days)" hint="Started but silent this many days → stalled.">
              <TextInput type="number" value={String(stalled)} onChange={(e) => setStalled(Number(e.target.value))} />
            </Field>
            <Field label="Never-activated after (days)" hint="Enrolled, never logged in this many days → never_activated.">
              <TextInput type="number" value={String(neverActivated)} onChange={(e) => setNeverActivated(Number(e.target.value))} />
            </Field>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={save} disabled={busy || !courseId}>{busy ? "Saving…" : "Save thresholds"}</Button>
            {saved && <span className="text-[13px] text-success font-semibold">Saved.</span>}
          </div>
        </Card>
      )}
    </div>
  );
}
