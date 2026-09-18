import type { RequestStatus } from "@/api/types";

export const STATUS_META: Record<
  RequestStatus,
  { label: string; color: string; icon: string; pulse: boolean }
> = {
  draft: { label: "Draft", color: "#64748b", icon: "📝", pulse: true },
  pending_info: { label: "Pending Info", color: "#f59e0b", icon: "❓", pulse: true },
  pending_approval: { label: "Pending Approval", color: "#a855f7", icon: "⏳", pulse: true },
  approved: { label: "Approved", color: "#22c55e", icon: "✅", pulse: false },
  escalated: { label: "Escalated", color: "#ef4444", icon: "⚠️", pulse: false },
  done: { label: "Done", color: "#3b82f6", icon: "🏁", pulse: false },
};

export function statusMeta(status: string) {
  return (
    STATUS_META[status as RequestStatus] ?? {
      label: status,
      color: "#64748b",
      icon: "•",
      pulse: false,
    }
  );
}

export function nodeColor(nodeName: string): string {
  switch (nodeName) {
    case "checkMissingInfo":
      return "#f59e0b";
    case "createDraft":
      return "#3b82f6";
    case "routeForApproval":
      return "#a855f7";
    case "close":
      return "#22c55e";
    case "escalate":
    case "escalateRequest":
      return "#ef4444";
    default:
      return "#64748b";
  }
}
