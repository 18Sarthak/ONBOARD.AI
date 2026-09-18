import { apiFetch } from "./client";
import type { Approval } from "./types";

export function getApprovals(requestId: string) {
  return apiFetch<{ requestId: string; approvals: Approval[] }>(
    `/api/approvals?requestId=${encodeURIComponent(requestId)}`,
  );
}
