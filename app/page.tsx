import AppRoot from "@/components/AppRoot";
import { getAdRules, getCourseTree, getCurrentUser, getEnrolledCourses, getUpsells } from "@/lib/queries";

// Server auth gate. No session → login. Session → app (dashboard) with the real
// user identity + enrolled courses + the live course tree / upsell / ad config
// (Phase 2.7-fix: portal reads from the DB, not fixtures). Dev controls = ?dev=1.
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
  const primaryId = enrolledCourses[0]?.id;
  const tree = primaryId ? await getCourseTree(primaryId) : { course: null, modules: [] };
  const upsells = primaryId ? await getUpsells(primaryId) : [];
  const adRules = primaryId ? await getAdRules(primaryId) : [];

  return (
    <AppRoot
      dev={dev}
      authed
      initialUser={user}
      enrolledCourses={enrolledCourses}
      course={tree.course}
      modules={tree.modules}
      upsells={upsells}
      adRules={adRules}
    />
  );
}
