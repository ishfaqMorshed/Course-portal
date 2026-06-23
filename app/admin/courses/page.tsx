"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, ErrorText, Field, PageHeader, Select, TextInput } from "@/components/admin/ui";
import { createCourse, listCourses, updateCourse } from "@/lib/admin/queries";
import type { CourseRow } from "@/lib/admin/types";

const STATUSES = ["draft", "published", "archived"] as const;

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ slug: "", title: "", status: "draft" as CourseRow["status"] });
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setCourses(await listCourses());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { reload(); }, []);

  const create = async () => {
    if (!draft.slug.trim() || !draft.title.trim()) { setError("Slug and title are required."); return; }
    setBusy(true);
    try {
      await createCourse({ slug: draft.slug.trim(), title: draft.title.trim(), status: draft.status });
      setDraft({ slug: "", title: "", status: "draft" });
      setCreating(false);
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (c: CourseRow, status: CourseRow["status"]) => {
    try {
      await updateCourse(c.id, { status });
      setCourses((cs) => cs.map((x) => (x.id === c.id ? { ...x, status } : x)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="Create courses, then open one to manage modules, lessons, and content."
        action={<Button onClick={() => setCreating((v) => !v)} variant={creating ? "ghost" : "primary"}>{creating ? "Cancel" : "+ New course"}</Button>}
      />

      {creating && (
        <Card className="mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Slug" hint="URL-safe, unique"><TextInput value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="ecommerce-launch-blueprint" /></Field>
            <Field label="Title"><TextInput value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="The E-commerce Launch Blueprint" /></Field>
            <Field label="Status">
              <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as CourseRow["status"] })}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </Field>
          </div>
          <div className="mt-4"><Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create course"}</Button></div>
        </Card>
      )}

      <ErrorText message={error} />

      {loading ? (
        <p className="text-sm text-textSecondary">Loading…</p>
      ) : courses.length === 0 ? (
        <Card><p className="text-sm text-textSecondary">No courses yet. Create one to get started.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {courses.map((c) => (
            <Card key={c.id} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-textPrimary truncate">{c.title}</div>
                <div className="text-[12px] text-textSecondary font-mono">{c.slug}</div>
              </div>
              <div className="shrink-0 w-36">
                <Select value={c.status} onChange={(e) => setStatus(c, e.target.value as CourseRow["status"])}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </div>
              <Link href={`/admin/courses/${c.id}`} className="shrink-0"><Button variant="ghost">Manage →</Button></Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
