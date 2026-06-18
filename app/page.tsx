import AppRoot from "@/components/AppRoot";
import { getCurrentUser, getEnrolledCourses } from "@/lib/queries";

// Server auth gate. No session → login. Session → app (dashboard) with the
// real user identity + enrolled courses. Dev/Tweaks controls keyed off ?dev=1.
export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const dev = searchParams?.dev === "1";
  const user = await getCurrentUser();

  if (!user) {
    return <AppRoot dev={dev} authed={false} />;
  }

  const enrolledCourses = await getEnrolledCourses();
  return <AppRoot dev={dev} authed initialUser={user} enrolledCourses={enrolledCourses} />;
}
