import { IconClock } from "@/components/icons";

export default function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={"fixed left-1/2 -translate-x-1/2 bottom-8 z-[60] transition-all duration-300 " + (visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none")}>
      <div className="flex items-center gap-2.5 bg-textPrimary text-white text-sm font-medium rounded-full pl-4 pr-5 py-3 shadow-float">
        <IconClock size={16} className="text-[#A5AAFB]" /> {message}
      </div>
    </div>
  );
}
