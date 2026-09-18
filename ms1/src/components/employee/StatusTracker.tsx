import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/loading-skeleton";
import { AgentTimeline } from "./AgentTimeline";
import { timeAgo } from "@/lib/time";
import type { OnboardingRequest } from "@/api/types";

export function EmptyTracker() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-[#1e1e2e] bg-[#13131a] p-10 text-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[#7c3aed]/15">
        <span className="absolute inset-0 animate-ping rounded-full bg-[#7c3aed]/10" />
        <Sparkles className="h-8 w-8 text-[#7c3aed]" />
      </div>
      <p className="mt-6 text-sm text-[#6b6b8a]">
        Submit a request to see your AI agent in action.
      </p>
    </div>
  );
}

export function TrackerSkeleton({ label }: { label?: string }) {
  return (
    <div className="space-y-4">
      {label && (
        <p className="text-xs text-[#6b6b8a] animate-pulse">{label}</p>
      )}
      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-6 w-48" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-4 h-24 w-full" />
      </div>
    </div>
  );
}

export function ErrorTracker({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-[#ef4444]/40 bg-[#13131a] p-10 text-center">
      <p className="text-sm font-medium text-[#ef4444]">{message}</p>
      <button
        type="button"
        aria-label="Retry loading request"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#1e1e2e] px-4 py-2 text-sm text-[#f1f0ff] transition-colors hover:bg-white/5"
      >
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    </div>
  );
}

function ReasoningBox({ reasoning }: { reasoning: string }) {
  const [fade, setFade] = useState(false);
  useEffect(() => {
    setFade(true);
    const t = window.setTimeout(() => setFade(false), 320);
    return () => window.clearTimeout(t);
  }, [reasoning]);

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5">
      <p className="text-xs font-medium text-[#f1f0ff]">🤖 Agent says:</p>
      <div
        className={`mt-3 max-h-[120px] overflow-y-auto rounded-lg border border-[#1e1e2e] bg-black/50 p-3 font-mono text-xs leading-relaxed text-[#c9c6f5] transition-opacity duration-300 ${
          fade ? "opacity-40" : "opacity-100"
        }`}
      >
        {reasoning || "Waiting for the agent's first thought…"}
      </div>
    </div>
  );
}

export function StatusTracker({ request, onClear }: { request: OnboardingRequest; onClear?: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(request.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      {(request.status === "approved" || request.status === "done") && (
        <div className="rounded-xl border border-[#22c55e]/40 bg-[#22c55e]/10 px-4 py-3 text-sm text-[#86efac]">
          ✅ Your request has been approved! The HR team will follow up shortly.
        </div>
      )}
      {request.status === "escalated" && (
        <div className="rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-4 py-3 text-sm text-[#fca5a5]">
          ⚠️ This request has been escalated due to SLA breach. HR has been notified.
        </div>
      )}

      <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-[#6b6b8a]">Request ID</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="font-mono text-sm text-[#f1f0ff]">{request.id.slice(0, 8)}…</code>
              <button
                type="button"
                aria-label="Copy request ID"
                onClick={copy}
                className="rounded-md p-1 text-[#6b6b8a] transition-colors hover:bg-white/5 hover:text-[#f1f0ff]"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-[#22c55e]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ["Employee", request.employeeName || "—"],
            ["Type", request.type || "—"],
            ["Department", request.department || "—"],
            ["Created", timeAgo(request.createdAt)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-[#6b6b8a]">{label}</dt>
              <dd className="mt-1 text-sm text-[#f1f0ff]">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <AgentTimeline status={request.status} />
      <ReasoningBox reasoning={request.latestLog?.reasoning ?? ""} />
    </div>
  );
}
