"use client";

import { useState } from "react";
import { Button, ErrorText, Field, Select, TextArea, TextInput } from "@/components/admin/ui";
import { deleteLesson, updateLesson } from "@/lib/admin/queries";
import { uploadThumbnail } from "@/lib/admin/storage";
import type { LessonResource, LessonRow, VideoSource } from "@/lib/admin/types";
import { cleanUrlOrThrow } from "@/lib/url";

const KINDS = ["pdf", "txt", "zip", "link", "other"];
const SOURCES: { value: VideoSource; label: string }[] = [
  { value: "vimeo", label: "Vimeo" },
  { value: "youtube", label: "YouTube" },
  { value: "url", label: "Direct URL" },
];

// Inline lesson editor. The admin picks the provider (video_source) and pastes a
// URL or ID, stored AS-IS in vimeo_id (the generic ref). The portal switches on
// video_source to build the embed — no string-guessing. Blank ref → no-video
// lesson (manual "Mark complete").
export default function LessonEditor({
  lesson,
  courseId,
  onSaved,
  onDeleted,
}: {
  lesson: LessonRow;
  courseId: string;
  onSaved: (l: LessonRow) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [source, setSource] = useState<VideoSource>(lesson.video_source ?? "vimeo");
  const [ref, setRef] = useState(lesson.vimeo_id ?? "");
  const [description, setDescription] = useState(lesson.description ?? "");
  const [resources, setResources] = useState<LessonResource[]>(lesson.resources ?? []);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(lesson.thumbnail_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploading(true);
    try {
      setThumbnailUrl(await uploadThumbnail(courseId, file));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const setRes = (i: number, patch: Partial<LessonResource>) =>
    setResources((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRes = () => setResources((rs) => [...rs, { name: "", url: "", kind: "pdf" }]);
  const removeRes = (i: number) => setResources((rs) => rs.filter((_, idx) => idx !== i));

  const save = async () => {
    if (!title.trim()) { setError("Title is required."); return; }
    setBusy(true);
    try {
      const cleanRes = resources
        .filter((r) => r.name.trim() || r.url.trim())
        .map((r) => ({ ...r, url: r.url.trim() ? cleanUrlOrThrow(r.url, `Resource "${r.name || "URL"}"`) : "" }));
      const saved = await updateLesson(lesson.id, {
        title: title.trim(),
        video_source: source,
        vimeo_id: ref.trim() || null, // pasted URL or bare ID, stored as-is
        description: description.trim() ? description.trim() : null,
        resources: cleanRes,
        thumbnail_url: thumbnailUrl,
      });
      onSaved(saved);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`Delete lesson "${lesson.title}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await deleteLesson(lesson.id);
      onDeleted(lesson.id);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const noVideo = !ref.trim();

  return (
    <div className="bg-subtle rounded-card p-4 mt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Video source">
          <Select value={source} onChange={(e) => setSource(e.target.value as VideoSource)}>
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label={source === "url" ? "Video file URL" : `${source === "youtube" ? "YouTube" : "Vimeo"} URL or ID`} hint={noVideo ? "Empty → no-video lesson (manual complete)" : "URL or bare ID — stored as-is"}>
          <TextInput value={ref} onChange={(e) => setRef(e.target.value)}
            placeholder={source === "vimeo" ? "https://vimeo.com/1202002241 or 1202002241" : source === "youtube" ? "https://youtu.be/KcQOWLZzc1A or KcQOWLZzc1A" : "https://…/lesson.mp4"} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Description"><TextArea value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
      </div>

      <div className="mt-4">
        <span className="block text-[13px] font-semibold text-textPrimary mb-1.5">Thumbnail</span>
        <div className="flex items-center gap-3">
          <label className="inline-flex items-center justify-center gap-1.5 rounded-btn px-3.5 py-2 text-sm font-semibold bg-subtle text-textPrimary hover:bg-promo cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={onPickThumb} disabled={uploading} />
            {uploading ? "Uploading…" : thumbnailUrl ? "Replace thumbnail" : "Upload thumbnail"}
          </label>
          {thumbnailUrl && <Button variant="danger" onClick={() => setThumbnailUrl(null)}>Remove</Button>}
        </div>
        <p className="text-[12px] text-textSecondary mt-1">Any size — shown cropped to fill a 16:10 card (object-cover). Save the lesson to apply.</p>
        {thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnailUrl} alt="" className="mt-2 w-48 aspect-[16/10] rounded-card border border-line object-cover" />
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-textPrimary">Resources</span>
          <Button variant="ghost" onClick={addRes}>+ Add resource</Button>
        </div>
        {resources.length === 0 && <p className="text-[12px] text-textSecondary">No resources.</p>}
        <div className="flex flex-col gap-2">
          {resources.map((r, i) => (
            <div key={i} className="flex flex-col sm:flex-row gap-2">
              <TextInput value={r.name} onChange={(e) => setRes(i, { name: e.target.value })} placeholder="Name (e.g. Toolkit Checklist.pdf)" className="sm:flex-1" />
              <TextInput value={r.url} onChange={(e) => setRes(i, { url: e.target.value })} placeholder="https://…" className="sm:flex-1" />
              <Select value={r.kind} onChange={(e) => setRes(i, { kind: e.target.value })} className="sm:w-28">
                {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </Select>
              <Button variant="danger" onClick={() => removeRes(i)}>Remove</Button>
            </div>
          ))}
        </div>
      </div>

      <ErrorText message={error} />

      <div className="flex items-center gap-2 mt-4">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save lesson"}</Button>
        <Button variant="danger" onClick={remove} disabled={busy}>Delete</Button>
      </div>
    </div>
  );
}
