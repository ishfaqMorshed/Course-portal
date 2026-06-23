"use client";

import { useEffect, useState } from "react";
import { Button, Card, ErrorText, Field, IconBtn, PageHeader, Select, TextInput } from "@/components/admin/ui";
import LessonEditor from "@/components/admin/LessonEditor";
import {
  createLesson,
  createModule,
  deleteModule,
  getCourse,
  listLessons,
  listModules,
  swapSort,
  updateCourse,
  updateModule,
} from "@/lib/admin/queries";
import { uploadThumbnail } from "@/lib/admin/storage";
import type { CourseRow, LessonRow, ModuleRow } from "@/lib/admin/types";

const STATUSES = ["draft", "published", "archived"] as const;

export default function CourseEditor({ courseId }: { courseId: string }) {
  const [course, setCourse] = useState<CourseRow | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<Record<string, LessonRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const c = await getCourse(courseId);
      setCourse(c);
      const mods = await listModules(courseId);
      setModules(mods);
      const entries = await Promise.all(mods.map(async (m) => [m.id, await listLessons(m.id)] as const));
      setLessons(Object.fromEntries(entries));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  // ---- course fields ----
  const saveCourse = async (patch: Partial<CourseRow>) => {
    if (!course) return;
    try {
      const saved = await updateCourse(course.id, patch);
      setCourse(saved);
    } catch (e) { setError((e as Error).message); }
  };

  const onPickThumb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setUploadingThumb(true);
    try {
      const url = await uploadThumbnail(courseId, file);
      await saveCourse({ thumbnail_url: url }); // persists immediately, like status
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploadingThumb(false);
    }
  };

  // ---- modules ---- (every handler refetches from the DB after the write, so
  // the UI reflects DB truth and an RLS-denied write surfaces as an error.)
  const addModule = async () => {
    try {
      const sort = (modules.at(-1)?.sort ?? 0) + 1;
      await createModule({ course_id: courseId, sort, title: "New module" });
      await load();
    } catch (e) { setError((e as Error).message); }
  };
  const renameModule = async (m: ModuleRow, title: string) => {
    try { await updateModule(m.id, { title }); await load(); } catch (e) { setError((e as Error).message); }
  };
  const removeModule = async (m: ModuleRow) => {
    if (!confirm(`Delete module "${m.title}" and all its lessons?`)) return;
    try { await deleteModule(m.id); await load(); } catch (e) { setError((e as Error).message); }
  };
  const moveModule = async (idx: number, dir: -1 | 1) => {
    const a = modules[idx], b = modules[idx + dir];
    if (!a || !b) return;
    try { await swapSort("modules", a, b); await load(); } catch (e) { setError((e as Error).message); }
  };

  // ---- lessons ----
  const addLesson = async (moduleId: string) => {
    try {
      const cur = lessons[moduleId] ?? [];
      const sort = (cur.at(-1)?.sort ?? 0) + 1;
      const l = await createLesson({ module_id: moduleId, sort, title: "New lesson", vimeo_id: null, description: null, resources: [] });
      setExpanded(l.id);
      await load();
    } catch (e) { setError((e as Error).message); }
  };
  const moveLesson = async (moduleId: string, idx: number, dir: -1 | 1) => {
    const list = lessons[moduleId] ?? [];
    const a = list[idx], b = list[idx + dir];
    if (!a || !b) return;
    try { await swapSort("lessons", a, b); await load(); } catch (e) { setError((e as Error).message); }
  };

  if (loading) return <p className="text-sm text-textSecondary">Loading…</p>;
  if (!course) return <div><ErrorText message={error ?? "Course not found."} /></div>;

  return (
    <div>
      <PageHeader title={course.title} subtitle="Edit course details, then manage modules and lessons below." />

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Title"><TextInput defaultValue={course.title} onBlur={(e) => e.target.value.trim() && e.target.value !== course.title && saveCourse({ title: e.target.value.trim() })} /></Field>
          <Field label="Slug"><TextInput defaultValue={course.slug} onBlur={(e) => e.target.value.trim() && e.target.value !== course.slug && saveCourse({ slug: e.target.value.trim() })} /></Field>
          <Field label="Status">
            <Select value={course.status} onChange={(e) => saveCourse({ status: e.target.value as CourseRow["status"] })}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
        </div>
        <p className="text-[12px] text-textSecondary mt-2">Title/slug save on blur.</p>
        <div className="mt-4">
          <span className="block text-[13px] font-semibold text-textPrimary mb-1.5">Course thumbnail</span>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center justify-center gap-1.5 rounded-btn px-3.5 py-2 text-sm font-semibold bg-subtle text-textPrimary hover:bg-promo cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={onPickThumb} disabled={uploadingThumb} />
              {uploadingThumb ? "Uploading…" : course.thumbnail_url ? "Replace thumbnail" : "Upload thumbnail"}
            </label>
            {course.thumbnail_url && <Button variant="danger" onClick={() => saveCourse({ thumbnail_url: null })}>Remove</Button>}
          </div>
          <p className="text-[12px] text-textSecondary mt-1">Any size — shown cropped to fill a 16:9 card (object-cover). Saves immediately.</p>
          {course.thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={course.thumbnail_url} alt="" className="mt-2 w-64 aspect-[16/9] rounded-card border border-line object-cover" />
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-textPrimary">Modules &amp; lessons</h2>
        <Button onClick={addModule}>+ Add module</Button>
      </div>

      <ErrorText message={error} />

      <div className="flex flex-col gap-4">
        {modules.map((m, mi) => (
          <Card key={m.id}>
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <IconBtn title="Move up" disabled={mi === 0} onClick={() => moveModule(mi, -1)}>↑</IconBtn>
                <IconBtn title="Move down" disabled={mi === modules.length - 1} onClick={() => moveModule(mi, 1)}>↓</IconBtn>
              </div>
              <TextInput defaultValue={m.title} onBlur={(e) => e.target.value.trim() && e.target.value !== m.title && renameModule(m, e.target.value.trim())} className="flex-1 font-semibold" />
              <Button variant="danger" onClick={() => removeModule(m)}>Delete module</Button>
            </div>

            <div className="mt-3 pl-9 flex flex-col gap-1.5">
              {(lessons[m.id] ?? []).length === 0 && <p className="text-[12px] text-textSecondary">No lessons yet.</p>}
              {(lessons[m.id] ?? []).map((l, li) => (
                <div key={l.id} className="border border-line rounded-card">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="flex flex-col">
                      <IconBtn title="Move up" disabled={li === 0} onClick={() => moveLesson(m.id, li, -1)}>↑</IconBtn>
                      <IconBtn title="Move down" disabled={li === (lessons[m.id]?.length ?? 0) - 1} onClick={() => moveLesson(m.id, li, 1)}>↓</IconBtn>
                    </div>
                    <button className="flex-1 text-left min-w-0" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                      <span className="text-sm font-medium text-textPrimary">{l.title}</span>
                      <span className="ml-2 text-[11px] text-textSecondary">{l.vimeo_id ? "video" : "no video"}</span>
                    </button>
                    <Button variant="ghost" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>{expanded === l.id ? "Close" : "Edit"}</Button>
                  </div>
                  {expanded === l.id && (
                    <div className="px-3 pb-3">
                      <LessonEditor
                        lesson={l}
                        courseId={courseId}
                        onSaved={() => load()}
                        onDeleted={() => { setExpanded(null); load(); }}
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="mt-1"><Button variant="ghost" onClick={() => addLesson(m.id)}>+ Add lesson</Button></div>
            </div>
          </Card>
        ))}
        {modules.length === 0 && <Card><p className="text-sm text-textSecondary">No modules yet. Add one to begin.</p></Card>}
      </div>
    </div>
  );
}
