import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { OnboardingRequest } from "@/api/types";

const inputClass =
  "w-full rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] px-3 py-2.5 text-sm text-[#f1f0ff] placeholder:text-[#4a4a63] outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20";

export function ApproveModal({
  request,
  onClose,
  onConfirm,
  isPending,
}: {
  request: OnboardingRequest | null;
  onClose: () => void;
  onConfirm: (approverRole: string) => void;
  isPending: boolean;
}) {
  const [role, setRole] = useState("");
  useEffect(() => {
    setRole(request?.latestApproval?.approverRole ?? "HR Coordinator");
  }, [request]);

  return (
    <Modal open={Boolean(request)} onClose={onClose} title="Approve Request">
      {request && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (role.trim()) onConfirm(role.trim());
          }}
        >
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-[#1e1e2e] bg-[#0a0a0f] p-3 text-xs">
            <div>
              <p className="text-[#6b6b8a]">Employee</p>
              <p className="mt-0.5 text-[#f1f0ff]">{request.employeeName}</p>
            </div>
            <div>
              <p className="text-[#6b6b8a]">Request type</p>
              <p className="mt-0.5 text-[#f1f0ff]">{request.type || "—"}</p>
            </div>
          </div>
          <div>
            <label htmlFor="approve-role" className="mb-1.5 block text-xs font-medium text-[#f1f0ff]">
              Your Role
            </label>
            <input
              id="approve-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. HR Business Partner"
              className={inputClass}
              required
            />
          </div>
          <button
            type="submit"
            aria-label="Confirm approval"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#22c55e] px-4 py-2.5 text-sm font-medium text-[#062012] transition-all hover:brightness-110 disabled:opacity-50"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirm Approval
          </button>
        </form>
      )}
    </Modal>
  );
}
