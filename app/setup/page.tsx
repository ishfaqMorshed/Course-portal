import SetupScreen from "@/components/screens/SetupScreen";

// /setup — first-time password setup (Phase 2.5). The welcome-email link points
// here with a one-time ?token (recovery) and a cosmetic ?email prefill. The token
// is claimed (and a password attached) only on submit — no session exists until
// then, so a buyer cannot reach the dashboard without setting a password.
export default function SetupPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  const email = typeof searchParams?.email === "string" ? searchParams.email : "";
  return <SetupScreen token={token} email={email} />;
}
