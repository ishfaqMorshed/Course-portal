"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconZap, NavIcon } from "@/components/icons";

const LINKS = [
  { href: "/admin/courses", label: "Courses", icon: "book" },
  { href: "/admin/upsells", label: "Upsells", icon: "grid" },
  { href: "/admin/ad-rules", label: "Ad Rules", icon: "folder" },
  { href: "/admin/segments", label: "Segments", icon: "grid" },
];

// Admin left sidebar — mirrors the student portal's Sidebar pattern.
export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-7 pb-8">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white"><IconZap size={18} strokeWidth={2} /></div>
          <span className="text-[15px] font-bold text-textPrimary tracking-tight">Admin</span>
        </div>
      </div>
      <nav className="flex flex-col gap-1 px-4">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link key={l.href} href={l.href}
              className={"relative flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors " +
                (active ? "bg-primarySoft text-primary" : "text-textSecondary hover:bg-subtle hover:text-textPrimary")}>
              {active && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary"></span>}
              <NavIcon kind={l.icon} />
              {l.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-4 pb-4">
        <Link href="/"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium text-textSecondary hover:bg-subtle hover:text-textPrimary">
          ← Back to portal
        </Link>
      </div>
    </div>
  );
}
