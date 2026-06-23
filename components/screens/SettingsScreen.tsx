"use client";

// Static 1:1 shell (DESIGN-BRIEF nav target). FROZEN: do not expand scope in
// future phases without a MASTER.md update.

import { useState, type ReactNode } from "react";
import { useCurrentUser } from "@/lib/current-user";
import { BRAND_NAME } from "@/lib/brand";
import { BtnSecondary } from "@/components/ui/Buttons";
import { IconBell, IconCreditCard, IconLogOut, IconUser } from "@/components/icons";

function Toggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} className={"w-11 h-6 rounded-full transition-colors relative " + (on ? "bg-primary" : "bg-canvasDeep")}>
      <span className={"absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all " + (on ? "left-[22px]" : "left-0.5")}></span>
    </button>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5 text-textPrimary"><span className="text-primary">{icon}</span><h2 className="text-[15px] font-bold">{title}</h2></div>
      {children}
    </div>
  );
}

export default function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const [emails, setEmails] = useState(true);
  const [reminders, setReminders] = useState(false);
  const user = useCurrentUser();

  return (
    <div className="px-6 lg:px-9 py-7 flex flex-col gap-5 max-w-[720px]">
      <Card icon={<IconUser size={18} />} title="Profile">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-promo text-primary font-bold flex items-center justify-center">{user.initials}</div>
          <div>
            <div className="text-[15px] font-semibold text-textPrimary">{user.name}</div>
            <div className="text-sm text-textSecondary">{user.email}</div>
          </div>
          <BtnSecondary className="ml-auto">Edit profile</BtnSecondary>
        </div>
      </Card>
      <Card icon={<IconBell size={18} />} title="Notifications">
        <div className="flex items-center justify-between">
          <div><div className="text-sm font-medium text-textPrimary">Course emails</div><div className="text-xs text-textSecondary">New lessons and announcements</div></div>
          <Toggle on={emails} set={setEmails} />
        </div>
        <div className="h-px bg-line"></div>
        <div className="flex items-center justify-between">
          <div><div className="text-sm font-medium text-textPrimary">Weekly reminders</div><div className="text-xs text-textSecondary">A nudge to keep your streak going</div></div>
          <Toggle on={reminders} set={setReminders} />
        </div>
      </Card>
      <Card icon={<IconCreditCard size={18} />} title="Billing">
        <div className="flex items-center justify-between">
          <div><div className="text-sm font-medium text-textPrimary">{BRAND_NAME}</div><div className="text-xs text-textSecondary">Lifetime access · purchased Mar 2026</div></div>
          <span className="text-xs font-semibold text-success bg-success/10 rounded-full px-3 py-1.5">Active</span>
        </div>
      </Card>
      <button onClick={onLogout} className="self-start inline-flex items-center gap-2 text-sm font-semibold text-danger hover:opacity-80 px-1"><IconLogOut size={16} /> Log out</button>
    </div>
  );
}
