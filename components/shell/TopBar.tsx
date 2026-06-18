"use client";

import { useState } from "react";
import { useCurrentUser } from "@/lib/current-user";
import { IconBell, IconChevronLeft, IconLogOut, IconMenu, IconSearch } from "@/components/icons";

export default function TopBar({
  title,
  subtitle,
  onBack,
  backLabel,
  onLogout,
  onMenu,
}: {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  backLabel?: string;
  onLogout: () => void;
  onMenu?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const user = useCurrentUser();
  return (
    <div className="flex items-center justify-between gap-4 px-6 lg:px-9 h-[76px] shrink-0 border-b border-line">
      <div className="flex items-center gap-3 min-w-0">
        {onMenu && (
          <button onClick={onMenu} className="lg:hidden w-9 h-9 -ml-1 rounded-[10px] flex items-center justify-center text-textSecondary hover:bg-subtle">
            <IconMenu size={20} />
          </button>
        )}
        <div className="min-w-0">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-1 text-primary text-[13px] font-semibold hover:text-primaryHover mb-0.5">
              <IconChevronLeft size={15} /> {backLabel || "Go Back"}
            </button>
          )}
          <h1 className="text-[22px] font-bold text-textPrimary leading-7 truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-textSecondary leading-4 truncate mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1.5 relative shrink-0">
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-textSecondary hover:bg-subtle" title="Search"><IconSearch size={18} /></button>
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-textSecondary hover:bg-subtle relative" title="Notifications">
          <IconBell size={18} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary"></span>
        </button>
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="w-9 h-9 rounded-full bg-promo text-primary text-xs font-bold flex items-center justify-center ml-1 ring-2 ring-transparent hover:ring-primarySoft">
          {user.initials}
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)}></div>
            <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-float border border-line p-2 w-52 z-40">
              <div className="px-3 py-2">
                <div className="text-sm font-semibold text-textPrimary">{user.name}</div>
                <div className="text-xs text-textSecondary">{user.email}</div>
              </div>
              <div className="h-px bg-line my-1"></div>
              <button onClick={() => { setMenuOpen(false); onLogout(); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm font-medium text-textSecondary hover:bg-subtle hover:text-textPrimary">
                <IconLogOut size={16} /> Log out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
