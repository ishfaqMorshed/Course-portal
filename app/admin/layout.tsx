import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminShell from "@/components/admin/AdminShell";

// Server-side admin guard (authoritative). Middleware also blocks /admin for
// non-admins (defense in depth), but this layout is the canonical gate: no
// session or not is_admin → redirect to the portal. Never client-only.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/");

  return <AdminShell email={profile.email ?? user.email ?? ""}>{children}</AdminShell>;
}
