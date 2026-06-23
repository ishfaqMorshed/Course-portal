"use client";

import { type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { createClient } from "@/lib/supabase/client";
import { IconLogOut } from "@/components/icons";

// Admin shell — mirrors the student portal's AppShell (rounded card + 240px
// sidebar + top bar + scrollable content), so admin matches the portal layout.
export default function AdminShell({ email, children }: { email: string; children: ReactNode }) {
  const router = useRouter();
  const logout = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <div className="h-screen w-screen p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-[24px] shadow-float w-full h-full flex overflow-hidden">
        <aside className="hidden lg:flex w-[240px] shrink-0 border-r border-line flex-col">
          <AdminSidebar />
        </aside>
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between gap-4 px-6 lg:px-9 h-[76px] shrink-0 border-b border-line">
            <h1 className="text-[22px] font-bold text-textPrimary leading-7 truncate">Admin dashboard</h1>
            <div className="flex items-center gap-3 text-[13px] text-textSecondary shrink-0">
              <span className="hidden sm:inline">{email}</span>
              <button onClick={logout} className="inline-flex items-center gap-1.5 font-semibold text-textSecondary hover:text-textPrimary">
                <IconLogOut size={16} /> Log out
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 lg:px-9 py-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
