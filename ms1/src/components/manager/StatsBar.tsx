import { AlertTriangle, Clock, Inbox, Zap } from "lucide-react";
import { timeAgo } from "@/lib/time";

function StatCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string | number;
  Icon: typeof Inbox;
}) {
  return (
    <div className="rounded-xl border border-[#1e1e2e] border-l-2 border-l-[#7c3aed] bg-[#13131a] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#6b6b8a]">{label}</p>
        <Icon className="h-4 w-4 text-[#7c3aed]" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[#f1f0ff]">{value}</p>
    </div>
  );
}

export function StatsBar({
  pending,
  total,
  escalations,
  lastSweep,
}: {
  pending: number;
  total: number;
  escalations: number;
  lastSweep: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Pending Approvals" value={pending} Icon={Clock} />
      <StatCard label="Total Requests" value={total} Icon={Inbox} />
      <StatCard label="Escalations Today" value={escalations} Icon={AlertTriangle} />
      <StatCard label="Last Sweep" value={lastSweep ? timeAgo(lastSweep) : "—"} Icon={Zap} />
    </div>
  );
}
