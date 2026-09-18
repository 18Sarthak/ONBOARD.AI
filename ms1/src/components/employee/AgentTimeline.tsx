import { CheckCircle2, Cpu, Inbox, ShieldCheck } from "lucide-react";
import type { RequestStatus } from "@/api/types";

const STEPS = [
  { key: "received", label: "Received", desc: "Your request reached the AI agent.", Icon: Inbox },
  {
    key: "processing",
    label: "AI Processing",
    desc: "The agent is extracting details and checking for missing info.",
    Icon: Cpu,
  },
  {
    key: "approval",
    label: "Awaiting Approval",
    desc: "Routed to the right approver on the HR team.",
    Icon: ShieldCheck,
  },
  {
    key: "completed",
    label: "Completed",
    desc: "A decision has been made on your request.",
    Icon: CheckCircle2,
  },
] as const;

function activeIndex(status: RequestStatus) {
  if (status === "draft" || status === "pending_info") return 1;
  if (status === "pending_approval") return 2;
  return 3;
}

export function AgentTimeline({ status }: { status: RequestStatus }) {
  const active = activeIndex(status);

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-6">
      <h3 className="text-sm font-semibold tracking-tight text-[#f1f0ff]">Agent Progress</h3>
      <ol className="mt-5 space-y-1">
        {STEPS.map((step, i) => {
          const done = i < active;
          const isActive = i === active;
          const color = done ? "#22c55e" : isActive ? "#7c3aed" : "#2a2a3d";
          return (
            <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
              {i < STEPS.length - 1 && (
                <span
                  className="absolute top-8 left-[15px] h-full w-px"
                  style={{ backgroundColor: done ? "#22c55e55" : "#1e1e2e" }}
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  isActive ? "animate-pulse" : ""
                }`}
                style={{ borderColor: color, backgroundColor: `${color}22`, color }}
              >
                <step.Icon className="h-4 w-4" />
              </span>
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: done || isActive ? "#f1f0ff" : "#6b6b8a" }}
                >
                  {step.label}
                </p>
                <p className="text-xs text-[#6b6b8a]">{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
