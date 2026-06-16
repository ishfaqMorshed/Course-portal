"use client";

import { FIXTURES } from "@/lib/fixtures";
import Placeholder from "@/components/ui/Placeholder";
import { IconSettings, IconZap, NavIcon } from "@/components/icons";

const F = FIXTURES;

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "grid" },
  { id: "courses", label: "My Courses", icon: "book" },
  { id: "resources", label: "Resources", icon: "folder" },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white">
        <IconZap size={18} strokeWidth={2} />
      </div>
      <span className="text-[15px] font-bold text-textPrimary tracking-tight">AI Profit</span>
    </div>
  );
}

// S0 sidebar body: logo · nav · lavender promo card · bottom-anchored Settings.
export default function Sidebar({ active, onNav }: { active: string; onNav: (id: string) => void }) {
  const promo = F.sidebarPromo;
  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-7 pb-8">
        <Logo />
      </div>
      <nav className="flex flex-col gap-1 px-4">
        {NAV.map((n) => {
          const isActive = active === n.id;
          return (
            <button key={n.id} onClick={() => onNav(n.id)}
              className={"relative flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors " +
                (isActive ? "bg-primarySoft text-primary" : "text-textSecondary hover:bg-subtle hover:text-textPrimary")}>
              {isActive && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary"></span>}
              <NavIcon kind={n.icon} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto px-4 pb-4 flex flex-col gap-2">
        {/* lavender promo card */}
        <div className="bg-promo rounded-2xl p-4 flex flex-col items-center text-center gap-3">
          <Placeholder label={promo.illustrationLabel} className="w-full h-20 rounded-xl bg-white/50" />
          <p className="text-xs text-textPrimary leading-4 font-medium">
            {promo.line1}<br /><span className="font-bold">{promo.line2}</span>
          </p>
          <button onClick={() => window.open(promo.url, "_blank")}
            className="w-full bg-white border-[1.5px] border-primary text-primary text-xs font-semibold rounded-[10px] py-2 hover:bg-white/70 transition-colors">
            {promo.cta}
          </button>
        </div>
        {/* settings, bottom-anchored */}
        <button onClick={() => onNav("settings")}
          className={"relative flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-colors " +
            (active === "settings" ? "bg-primarySoft text-primary" : "text-textSecondary hover:bg-subtle hover:text-textPrimary")}>
          {active === "settings" && <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-primary"></span>}
          <IconSettings size={20} /> Settings
        </button>
      </div>
    </div>
  );
}
