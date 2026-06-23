"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorText, Field, PageHeader, Select, TextArea, TextInput } from "@/components/admin/ui";
import { useCoursePicker } from "@/components/admin/useCoursePicker";
import { createUpsell, deleteUpsell, listModules, listUpsells, updateUpsell } from "@/lib/admin/queries";
import type { ModuleRow, Placement, UpsellRow } from "@/lib/admin/types";
import { cleanUrlOrThrow } from "@/lib/url";
import { uploadUpsellImage } from "@/lib/admin/storage";

const PLACEMENTS: Placement[] = ["rail", "sidebar_promo", "completion"];
const PLACEMENT_LABEL: Record<Placement, string> = {
  rail: "Rail (per-module)",
  sidebar_promo: "Sidebar promo (global)",
  completion: "Completion",
};

function UpsellCard({ row, modules, onChange, onDelete }: { row: UpsellRow; modules: ModuleRow[]; onChange: (r: UpsellRow) => void; onDelete: (id: string) => void }) {
  const [draft, setDraft] = useState(row);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<UpsellRow>) => setDraft((d) => ({ ...d, ...patch }));

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadUpsellImage(row.course_id, file);
      set({ image_url: url });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const cta_url = cleanUrlOrThrow(draft.cta_url, "CTA URL");
      const image_url = draft.image_url?.trim() ? cleanUrlOrThrow(draft.image_url, "Image URL") : null;
      const saved = await updateUpsell(row.id, {
        module_id: draft.placement === "rail" ? draft.module_id : null,
        placement: draft.placement,
        headline: draft.headline,
        body: draft.body,
        cta_label: draft.cta_label,
        cta_url,
        image_url,
        intensity: draft.intensity,
      });
      onChange(saved);
      setError(null);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!confirm("Delete this upsell row?")) return;
    try { await deleteUpsell(row.id); onDelete(row.id); } catch (e) { setError((e as Error).message); }
  };

  return (
    <Card>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Placement">
          <Select value={draft.placement} onChange={(e) => set({ placement: e.target.value as Placement })}>
            {PLACEMENTS.map((p) => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
          </Select>
        </Field>
        {draft.placement === "rail" ? (
          <Field label="Module">
            <Select value={draft.module_id ?? ""} onChange={(e) => set({ module_id: e.target.value || null })}>
              <option value="">— select module —</option>
              {modules.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
            </Select>
          </Field>
        ) : <div />}
        <Field label="Intensity (1–5)">
          <Select value={String(draft.intensity)} onChange={(e) => set({ intensity: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-4"><Field label="Headline"><TextInput value={draft.headline} onChange={(e) => set({ headline: e.target.value })} /></Field></div>
      <div className="mt-4"><Field label="Body"><TextArea value={draft.body} onChange={(e) => set({ body: e.target.value })} /></Field></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Field label="CTA label"><TextInput value={draft.cta_label} onChange={(e) => set({ cta_label: e.target.value })} /></Field>
        <Field label="CTA URL"><TextInput value={draft.cta_url} onChange={(e) => set({ cta_url: e.target.value })} placeholder="https://…" /></Field>
      </div>
      <div className="mt-4">
        <span className="block text-[13px] font-semibold text-textPrimary mb-1.5">Promo image</span>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center justify-center gap-1.5 rounded-btn px-3.5 py-2 text-sm font-semibold bg-subtle text-textPrimary hover:bg-promo cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
            {uploading ? "Uploading…" : draft.image_url ? "Replace image" : "Upload image"}
          </label>
          {draft.image_url && <Button variant="danger" onClick={() => set({ image_url: null })}>Remove</Button>}
        </div>
        <p className="text-[12px] text-textSecondary mt-1">Uploaded to the public upsell-images bucket. Shown at natural aspect ratio in the panel.</p>
        {draft.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={draft.image_url} alt="" className="mt-2 max-h-40 w-auto rounded-card border border-line object-contain" />
        )}
      </div>
      <ErrorText message={error} />
      <div className="flex items-center gap-2 mt-4">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        <Button variant="danger" onClick={remove}>Delete</Button>
      </div>
    </Card>
  );
}

export default function AdminUpsellsPage() {
  const { courseId, picker, pickerError } = useCoursePicker();
  const [rows, setRows] = useState<UpsellRow[]>([]);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    (async () => {
      try {
        setRows(await listUpsells(courseId));
        setModules(await listModules(courseId));
        setError(null);
      } catch (e) { setError((e as Error).message); } finally { setLoading(false); }
    })();
  }, [courseId]);

  const addRow = async () => {
    try {
      const created = await createUpsell({
        course_id: courseId, module_id: null, placement: "sidebar_promo",
        headline: "New upsell", body: "", cta_label: "Learn more", cta_url: "https://example.com", intensity: 3, image_url: null,
      });
      setRows((r) => [...r, created]);
    } catch (e) { setError((e as Error).message); }
  };

  const grouped = PLACEMENTS.map((p) => ({ placement: p, items: rows.filter((r) => r.placement === p) }));

  return (
    <div>
      <PageHeader title="Upsells" subtitle="Rail (per-module), global sidebar promo, and completion upsell." action={<Button onClick={addRow} disabled={!courseId}>+ New upsell</Button>} />
      <div className="mb-5">{picker}</div>
      <ErrorText message={pickerError ?? error} />
      {loading ? <p className="text-sm text-textSecondary">Loading…</p> : (
        <div className="flex flex-col gap-6">
          {grouped.map((g) => (
            <div key={g.placement}>
              <h3 className="text-sm font-bold text-textPrimary mb-2">{PLACEMENT_LABEL[g.placement]}</h3>
              {g.items.length === 0 ? <p className="text-[12px] text-textSecondary">None.</p> : (
                <div className="flex flex-col gap-3">
                  {g.items.map((row) => (
                    <UpsellCard key={row.id} row={row} modules={modules}
                      onChange={(r) => setRows((rs) => rs.map((x) => (x.id === r.id ? r : x)))}
                      onDelete={(id) => setRows((rs) => rs.filter((x) => x.id !== id))} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
