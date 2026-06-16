import type { ReactNode } from "react";

export default function StatCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  accent?: string;
}) {
  return (
    <div className="bg-white border border-line rounded-2xl p-5 flex items-center gap-4">
      <div className={"w-11 h-11 rounded-xl flex items-center justify-center shrink-0 " + (accent || "bg-primarySoft text-primary")}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[22px] font-bold text-textPrimary leading-7 whitespace-nowrap">{value}</div>
        <div className="text-xs text-textSecondary mt-0.5">{label}</div>
      </div>
    </div>
  );
}
