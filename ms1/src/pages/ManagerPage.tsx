import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { StatsBar } from "@/components/manager/StatsBar";
import { ApprovalCard } from "@/components/manager/ApprovalCard";
import { ApproveModal } from "@/components/manager/ApproveModal";
import { RejectModal } from "@/components/manager/RejectModal";
import { ActivityLog } from "@/components/manager/ActivityLog";
import { RunSweepFab } from "@/components/manager/RunSweepFab";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { approveRequest, rejectRequest } from "@/api/requests";
import { runSweep } from "@/api/agent";
import { useKnownRequests, useLogsPolling } from "@/hooks/useManagerData";
import type { OnboardingRequest } from "@/api/types";

export function ManagerPage() {
  const queryClient = useQueryClient();
  const logsQuery = useLogsPolling();
  const logs = useMemo(() => logsQuery.data?.logs ?? [], [logsQuery.data]);

  const requestIds = useMemo(
    () => Array.from(new Set(logs.map((l) => l.requestId).filter((id): id is string => !!id))),
    [logs],
  );

  const { requests, isLoading } = useKnownRequests(requestIds);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const pending = requests.filter(
    (r) => r.status === "pending_approval" && !dismissed.includes(r.id),
  );

  const [approveTarget, setApproveTarget] = useState<OnboardingRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OnboardingRequest | null>(null);

  const escalationsToday = logs.filter((l) => {
    const isEscalate = /escalate/i.test(l.nodeName);
    const sameDay = new Date(l.timestamp).toDateString() === new Date().toDateString();
    return isEscalate && sameDay;
  }).length;

  const lastSweep =
    logs
      .filter((l) => !l.requestId || /sweep|escalate/i.test(l.nodeName))
      .map((l) => l.timestamp)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

  const refetchAll = () => {
    logsQuery.refetch();
    queryClient.invalidateQueries({ queryKey: ["request"] });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => approveRequest(id, role),
    onSuccess: (_d, vars) => {
      toast.success("✅ Request approved! Agent will continue processing.");
      setApproveTarget(null);
      window.setTimeout(() => setDismissed((d) => [...d, vars.id]), 1000);
      refetchAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, role, reason }: { id: string; role: string; reason: string }) =>
      rejectRequest(id, role, reason),
    onSuccess: (_d, vars) => {
      toast("Request rejected. Agent will re-process.");
      setRejectTarget(null);
      setDismissed((d) => [...d, vars.id]);
      refetchAll();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sweepMutation = useMutation({
    mutationFn: runSweep,
    onSuccess: (data) => {
      toast.success(`Sweep complete. ${data.escalated} requests escalated.`);
      refetchAll();
    },
    onError: () => toast.error("Sweep failed. Check server logs."),
  });

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-10 pb-28">
      <h1 className="text-2xl font-semibold tracking-tight text-[#f1f0ff]">Manager Dashboard</h1>
      <p className="mt-1 text-sm text-[#6b6b8a]">
        Acme Corp onboarding approvals and live agent activity.
      </p>

      <div className="mt-8">
        <StatsBar
          pending={pending.length}
          total={requestIds.length}
          escalations={escalationsToday}
          lastSweep={lastSweep}
        />
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-[#f1f0ff]">Pending Approvals</h2>
          <button
            type="button"
            aria-label="Refresh pending approvals"
            onClick={refetchAll}
            className="rounded-lg border border-[#1e1e2e] p-2 text-[#6b6b8a] transition-colors hover:bg-white/5 hover:text-[#f1f0ff]"
          >
            <RefreshCw className={`h-4 w-4 ${logsQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {isLoading && pending.length === 0 ? (
            <>
              <CardSkeleton />
              <CardSkeleton />
            </>
          ) : pending.length === 0 ? (
            <div className="col-span-full rounded-xl border border-[#1e1e2e] bg-[#13131a] p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#22c55e]/15 text-2xl">
                ✅
              </div>
              <p className="mt-4 text-sm text-[#6b6b8a]">
                No requests pending approval. All clear! 🎉
              </p>
            </div>
          ) : (
            pending.map((r) => (
              <ApprovalCard
                key={r.id}
                request={r}
                onApprove={() => setApproveTarget(r)}
                onReject={() => setRejectTarget(r)}
              />
            ))
          )}
        </div>
      </section>

      <div className="mt-10">
        <ActivityLog logs={logs} isLoading={logsQuery.isLoading} />
      </div>

      <RunSweepFab onRun={() => sweepMutation.mutate()} isRunning={sweepMutation.isPending} />

      <ApproveModal
        request={approveTarget}
        onClose={() => setApproveTarget(null)}
        isPending={approveMutation.isPending}
        onConfirm={(role) =>
          approveTarget && approveMutation.mutate({ id: approveTarget.id, role })
        }
      />
      <RejectModal
        request={rejectTarget}
        onClose={() => setRejectTarget(null)}
        isPending={rejectMutation.isPending}
        onConfirm={(role, reason) =>
          rejectTarget && rejectMutation.mutate({ id: rejectTarget.id, role, reason })
        }
      />
    </div>
  );
}
