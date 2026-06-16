import AppRoot from "@/components/AppRoot";

// Dev/Tweaks controls (TweaksPanel, login dev bar, in-course ad-trigger hint)
// render only when ?dev=1 is present.
export default function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const dev = searchParams?.dev === "1";
  return <AppRoot dev={dev} />;
}
