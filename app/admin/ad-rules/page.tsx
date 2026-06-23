"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorText, Field, PageHeader, Select, TextInput } from "@/components/admin/ui";
import { useCoursePicker } from "@/components/admin/useCoursePicker";
import { createAdRule, deleteAdRule, listAdRules, listLessons, listModules, updateAdRule } from "@/lib/admin/queries";
import type { AdRuleRow, AdScope, LessonRow, ModuleRow, TriggerType } from "@/lib/admin/types";
import { cleanUrlOrThrow } from "@/lib/url";

const SCOPES: AdScope[] = ["course", "module", "lesson"];
const TRIGGERS: TriggerType[] = ["pct", "timestamp_s"];

function RuleCard({ row, modules, lessons, onChange, onDelete }: {
  row: AdRuleRow; modules: ModuleRow[]; lessons: LessonRow[];
  onChange: (r: AdRuleRow) => void; onDelete: (id: string) => void;
}) {
  const [d, setD] = useState(row);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<AdRuleRow>) => setD((x) => ({ ...x, ...patch }));

  const save = async () => {
    setBusy(true);
    try {
      const saved = await updateAdRule(row.id, {
        scope: d.scope,
        module_id: d.scope === "module" ? d.module_id : null,
        lesson_id: d.scope === "lesson" ? d.lesson_id : null,
        trigger_type: d.trigger_type,
        trigger_value: Number(d.trigger_value),
        skippable_after_s: Number(d.skippable_after_s),
        asset_url: d.asset_url?.trim() ? cleanUrlOrThrow(d.asset_url, "Asset URL") : null,
        cta_url: d.cta_url?.trim() ? cleanUrlOrThrow(d.cta_url, "CTA URL") : null,
        active: d.active,
        headline: d.headline?.trim() || null,
        cta_label: d.cta_label?.trim() || null,
      });
      onChange(saved); setError(null);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Delete this ad rule?")) return;
    try { await deleteAdRule(row.id); onDelete(row.id); } catch (e) { setError((e as Error).message); }
  };

  return (
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Scope">
          <Select value={d.scope} onChange={(e) => set({ scope: e.target.value as AdScope })}>
            {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        {d.scope === "module" && (
          <Field label="Target module">
            <Select value={d.module_id ?? ""} onChange={(e) => set({ module_id: e.target.value || null })}>
              <option value="">— select —</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </Select>
          </Field>
        )}
        {d.scope === "lesson" && (
          <Field label="Target lesson">
            <Select value={d.lesson_id ?? ""} onChange={(e) => set({ lesson_id: e.target.value || null })}>
              <option value="">— select —</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Active">
          <Select value={d.active ? "yes" : "no"} onChange={(e) => set({ active: e.target.value === "yes" })}>
            <option value="yes">active</option>
            <option value="no">inactive</option>
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <Field label="Trigger type">
          <Select value={d.trigger_type} onChange={(e) => set({ trigger_type: e.target.value as TriggerType })}>
            {TRIGGERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
        <Field label={d.trigger_type === "pct" ? "Trigger value (%)" : "Trigger value (seconds)"}>
          <TextInput type="number" value={String(d.trigger_value)} onChange={(e) => set({ trigger_value: Number(e.target.value) })} />
        </Field>
        <Field label="Skippable after (s)"><TextInput type="number" value={String(d.skippable_after_s)} onChange={(e) => set({ skippable_after_s: Number(e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Field label="Headline" hint="Shown on the ad overlay"><TextInput value={d.headline ?? ""} onChange={(e) => set({ headline: e.target.value })} placeholder="A quick message before you continue" /></Field>
        <Field label="CTA label"><TextInput value={d.cta_label ?? ""} onChange={(e) => set({ cta_label: e.target.value })} placeholder="Learn more" /></Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Field label="Asset URL" hint="Ad image (natural aspect ratio)"><TextInput value={d.asset_url ?? ""} onChange={(e) => set({ asset_url: e.target.value })} placeholder="https://…" /></Field>
        <Field label="CTA URL"><TextInput value={d.cta_url ?? ""} onChange={(e) => set({ cta_url: e.target.value })} placeholder="https://…" /></Field>
      </div>
      {d.asset_url?.trim() && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={d.asset_url} alt="" className="mt-3 max-h-40 w-auto rounded-card border border-line object-contain" />
      )}
      <ErrorText message={error} />
      <div className="flex items-center gap-2 mt-4">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        <Button variant="danger" onClick={remove}>Delete</Button>
      </div>
    </Card>
  );
}

export default function AdminAdRulesPage() {
  const { courseId, picker, pickerError } = useCoursePicker();
  const [rows, setRows] = useState<AdRuleRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    (async () => {
      try {
        setRows(await listAdRules(courseId));
        const mods = await listModules(courseId);
        setModules(mods);
        const perMod = await Promise.all(mods.map((m) => listLessons(m.id)));
        setLessons(perMod.flat());
        setError(null);
      } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    })();
  }, [courseId]);

  const addRule = async () => {
    try {
      const created = await createAdRule({
        course_id: courseId, scope: "course", module_id: null, lesson_id: null,
        trigger_type: "pct", trigger_value: 50, skippable_after_s: 5, asset_url: null, cta_url: null, active: true,
        headline: null, cta_label: null,
      });
      setRows((r) => [...r, created]);
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <div>
      <PageHeader title="Ad Rules" subtitle="Scope course / module / lesson, with a target picker for module & lesson scope." action={<Button onClick={addRule} disabled={!courseId}>+ New rule</Button>} />
      <div className="mb-5">{picker}</div>
      <ErrorText message={pickerError ?? error} />
      {loading ? <p className="text-sm text-textSecondary">Loading…</p> : rows.length === 0 ? (
        <Card><p className="text-sm text-textSecondary">No ad rules for this course yet.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <RuleCard key={row.id} row={row} modules={modules} lessons={lessons}
              onChange={(r) => setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)))}
              onDelete={(id) => setRows((rs) => rs.filter((x) => x.id !== id))} />
          ))}
        </div>
      )}
    </div>
  );
}
