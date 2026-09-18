import { Loader2, Zap } from "lucide-react";

export function RunSweepFab({ onRun, isRunning }: { onRun: () => void; isRunning: boolean }) {
  return (
    <button
      type="button"
      aria-label="Run SLA escalation sweep"
      onClick={onRun}
      disabled={isRunning}
      className="fixed right-6 bottom-6 z-30 inline-flex items-center gap-2 rounded-full bg-[#7c3aed] px-5 py-3 text-sm font-medium text-white shadow-lg shadow-[#7c3aed]/30 transition-all hover:brightness-110 disabled:opacity-60"
    >
      {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
      {isRunning ? "Running…" : "Run SLA Sweep"}
    </button>
  );
}
