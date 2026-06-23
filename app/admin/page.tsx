import { redirect } from "next/navigation";

// /admin → land on Courses.
export default function AdminIndex() {
  redirect("/admin/courses");
}
