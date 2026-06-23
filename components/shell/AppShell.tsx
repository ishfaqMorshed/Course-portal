"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/shell/Sidebar";
import TopBar from "@/components/shell/TopBar";
import { IconX } from "@/components/icons";
import type { SidebarPromo } from "@/lib/types";

export interface AppShellProps {
  active: string;
  onNav: (id: string) => void;
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
  backLabel?: string;
  onLogout: () => void;
  sidebarPromo?: SidebarPromo | null;
  children: ReactNode;
}

// S0 — App Shell: 240px sidebar + top bar + scrollable content (mobile drawer).
export default function AppShell({ active, onNav, title, subtitle, onBack, backLabel, onLogout, sidebarPromo, children }: AppShellProps) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="h-screen w-screen p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-[24px] shadow-float w-full h-full flex overflow-hidden">
        {/* sidebar */}
        <aside className="hidden lg:flex w-[240px] shrink-0 border-r border-line flex-col">
          <Sidebar active={active} onNav={onNav} promo={sidebarPromo} />
        </aside>
        {/* mobile drawer */}
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-textPrimary/50" onClick={() => setDrawer(false)}></div>
            <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-white shadow-float flex flex-col">
              <button onClick={() => setDrawer(false)} className="absolute top-5 right-4 w-8 h-8 rounded-full flex items-center justify-center text-textSecondary hover:bg-subtle z-10"><IconX size={18} /></button>
              <Sidebar active={active} onNav={(id) => { setDrawer(false); onNav(id); }} promo={sidebarPromo} />
            </div>
          </div>
        )}
        {/* main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          <TopBar title={title} subtitle={subtitle} onBack={onBack} backLabel={backLabel} onLogout={onLogout} onMenu={() => setDrawer(true)} />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
