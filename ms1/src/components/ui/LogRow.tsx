import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { JsonViewer } from "./JsonViewer";
import { nodeColor } from "@/lib/status";
import { formatTime, timeAgo } from "@/lib/time";
import type { AgentLog } from "@/api/types";

export function LogRow({ log }: { log: AgentLog }) {
  const [open, setOpen] = useState(false);
  const color = nodeColor(log.nodeName);

  return (
    <div className="animate-fade-in border-b border-[#1e1e2e] px-4 py-3 transition-colors hover:bg-white/[0.02]">
      <div className="flex flex-wrap items-center gap-3">
        <time className="font-mono text-xs text-[#6b6b8a]" title={timeAgo(log.timestamp)}>
          {formatTime(log.timestamp)}
        </time>
        <span
          className="rounded-md px-2 py-0.5 text-xs font-medium"
          style={{ color, backgroundColor: `${color}1a`, border: `1px solid ${color}44` }}
        >
          {log.nodeName}
        </span>
        <p className="min-w-[200px] flex-1 text-sm text-[#f1f0ff]">{log.reasoning}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 pl-1">
        {log.toolCalled && (
          <span className="rounded-md border border-[#a855f7]/40 bg-[#a855f7]/10 px-2 py-0.5 font-mono text-xs text-[#c084fc]">
            🔧 {log.toolCalled}
          </span>
        )}
        {log.result && Object.keys(log.result).length > 0 && (
          <button
            type="button"
            aria-label="Toggle log result details"
            onClick={() => setOpen((s) => !s)}
            className="inline-flex items-center gap-1 text-xs text-[#6b6b8a] transition-colors hover:text-[#f1f0ff]"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Hide details" : "Show details"}
          </button>
        )}
      </div>
      {open && <JsonViewer value={log.result} />}
    </div>
  );
}
