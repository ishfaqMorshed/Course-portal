import { IconDownload, IconFileText } from "@/components/icons";
import type { Resource } from "@/lib/types";

export default function ResourceRow({ resource, sub }: { resource: Resource; sub?: string }) {
  return (
    <div className="flex items-center gap-4 bg-white border border-line rounded-2xl p-4 min-w-0">
      <div className="w-12 h-12 rounded-[10px] bg-promo flex items-center justify-center text-primary shrink-0">
        <IconFileText size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold text-textPrimary truncate">{resource.name}</div>
        <div className="text-xs text-textSecondary mt-0.5 line-clamp-1">{sub || resource.size + " · click to download"}</div>
      </div>
      <button className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-primary hover:bg-primarySoft shrink-0" title="Download">
        <IconDownload size={18} />
      </button>
    </div>
  );
}
