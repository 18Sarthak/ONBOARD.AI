import { useMemo, useState } from "react";
import { LogRow } from "@/components/ui/LogRow";
import { Skeleton } from "@/components/ui/loading-skeleton";
import type { AgentLog } from "@/api/types";

const PAGE = 50;

export function ActivityLog({ logs, isLoading }: { logs: AgentLog[]; isLoading: boolean }) {
  const [tab, setTab] = useState<"all" | "byRequest">("all");
  const [requestId, setRequestId] = useState("");
  const [visible, setVisible] = useState(PAGE);

  const requestIds = useMemo(
    () => Array.from(new Set(logs.map((l) => l.requestId).filter((id): id is string => !!id))),
    [logs],
  );

  const sorted = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [logs],
  );

  const filtered =
    tab === "byRequest" && requestId ? sorted.filter((l) => l.requestId === requestId) : sorted;
  const shown = filtered.slice(0, visible);

  const tabClass = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs transition-colors ${
      active ? "bg-[#7c3aed]/15 text-[#c084fc]" : "text-[#6b6b8a] hover:text-[#f1f0ff]"
    }`;

  return (
    <section className="rounded-xl border border-[#1e1e2e] bg-[#13131a]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1e1e2e] p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-[#f1f0ff]">
            Agent Activity Log
          </h2>
          <span className="rounded-full border border-[#1e1e2e] bg-[#0a0a0f] px-2 py-0.5 text-xs text-[#6b6b8a]">
            {logs.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Show all logs"
            className={tabClass(tab === "all")}
            onClick={() => setTab("all")}
          >
            All Logs
          </button>
          <button
            type="button"
            aria-label="Filter logs by request"
            className={tabClass(tab === "byRequest")}
            onClick={() => setTab("byRequest")}
          >
            By Request
          </button>
          {tab === "byRequest" && (
            <select
              aria-label="Select request"
              value={requestId}
              onChange={(e) => setRequestId(e.target.value)}
              className="rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-2 py-1.5 font-mono text-xs text-[#f1f0ff] outline-none focus:border-[#7c3aed]"
            >
              <option value="">All requests</option>
              {requestIds.map((id) => (
                <option key={id} value={id}>
                  {id.slice(0, 8)}…
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isLoading && logs.length === 0 ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="p-8 text-center text-sm text-[#6b6b8a]">No agent activity yet.</p>
      ) : (
        <div>
          {shown.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
          {filtered.length > shown.length && (
            <div className="p-4 text-center">
              <button
                type="button"
                aria-label="Load more log entries"
                onClick={() => setVisible((v) => v + PAGE)}
                className="rounded-lg border border-[#1e1e2e] px-4 py-2 text-xs text-[#f1f0ff] transition-colors hover:bg-white/5"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
