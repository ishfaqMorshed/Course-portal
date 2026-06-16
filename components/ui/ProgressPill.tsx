export default function ProgressPill({
  pct,
  className = "",
  trackClass = "bg-subtle",
  fillClass = "bg-primary",
}: {
  pct: number;
  className?: string;
  trackClass?: string;
  fillClass?: string;
}) {
  return (
    <div className={"h-1.5 rounded-full overflow-hidden " + trackClass + " " + className}>
      <div
        className={"h-full rounded-full transition-all duration-500 " + fillClass}
        style={{ width: Math.min(100, Math.max(0, pct)) + "%" }}
      ></div>
    </div>
  );
}
