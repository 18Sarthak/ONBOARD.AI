import { useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { timeAgo } from "@/lib/time";
import type { OnboardingRequest } from "@/api/types";

export function ApprovalCard({
  request,
  onApprove,
  onReject,
}: {
  request: OnboardingRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const [showReasoning, setShowReasoning] = useState(false);
  const details = Object.entries(request.details ?? {});

  return (
    <div className="animate-fade-in rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold tracking-tight text-[#f1f0ff]">
            {request.employeeName}
          </p>
          <code className="font-mono text-xs text-[#6b6b8a]">{request.id.slice(0, 8)}…</code>
        </div>
        <StatusBadge status={request.status} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {[request.type, request.department].filter(Boolean).map((tag) => (
          <span
            key={tag}
            className="rounded-md border border-[#1e1e2e] bg-[#0a0a0f] px-2 py-1 text-xs text-[#6b6b8a]"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-[#6b6b8a]">Approver</p>
          <p className="mt-0.5 text-[#f1f0ff]">{request.latestApproval?.approverRole ?? "—"}</p>
        </div>
        <div>
          <p className="text-[#6b6b8a]">Waiting</p>
          <p className="mt-0.5 text-[#f1f0ff]">{timeAgo(request.updatedAt)}</p>
        </div>
      </div>

      {details.length > 0 && (
        <dl className="mt-4 space-y-1 rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-xs">
          {details.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-[#6b6b8a]">{k}:</dt>
              <dd className="text-[#f1f0ff]">
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {request.latestLog?.reasoning && (
        <div className="mt-4">
          <button
            type="button"
            aria-label="Toggle AI reasoning"
            onClick={() => setShowReasoning((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-[#a855f7] transition-colors hover:text-[#c084fc]"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showReasoning ? "rotate-180" : ""}`}
            />
            {showReasoning ? "Hide AI reasoning" : "Show AI reasoning"}
          </button>
          {showReasoning && (
            <p className="animate-fade-in mt-2 rounded-lg border border-[#1e1e2e] bg-black/50 p-3 font-mono text-xs leading-relaxed text-[#c9c6f5]">
              {request.latestLog.reasoning}
            </p>
          )}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <button
          type="button"
          aria-label={`Approve request for ${request.employeeName}`}
          onClick={onApprove}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#22c55e]/50 px-3 py-2 text-sm font-medium text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
        >
          <Check className="h-4 w-4" /> Approve
        </button>
        <button
          type="button"
          aria-label={`Reject request for ${request.employeeName}`}
          onClick={onReject}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-[#ef4444]/50 px-3 py-2 text-sm font-medium text-[#ef4444] transition-colors hover:bg-[#ef4444]/10"
        >
          <X className="h-4 w-4" /> Reject
        </button>
      </div>
    </div>
  );
}
