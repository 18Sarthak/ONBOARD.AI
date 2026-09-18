import { statusMeta } from "@/lib/status";

export function StatusBadge({ status, animate = true }: { status: string; animate?: boolean }) {
  const meta = statusMeta(status);
  const pulse = animate && meta.pulse;

  return (
    <span
      role="status"
      aria-label={`Status: ${meta.label}`}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        color: meta.color,
        borderColor: `${meta.color}55`,
        backgroundColor: `${meta.color}1a`,
      }}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: meta.color }}
      />
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
