// Striped, labeled placeholder image (stands in for real media in Phase 1.5).

export default function Placeholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={"placeholder-stripes relative flex items-center justify-center overflow-hidden " + className}>
      <span className="font-mono text-[10px] text-[#8A8FA8] bg-white/70 rounded-md px-2 py-1 whitespace-nowrap">{label}</span>
    </div>
  );
}
