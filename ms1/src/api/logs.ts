import { apiFetch } from "./client";
import type { AgentLog } from "./types";

export function getLogs(requestId?: string) {
  const qs = requestId ? `?requestId=${encodeURIComponent(requestId)}` : "";
  return apiFetch<{ logs: AgentLog[] }>(`/api/logs${qs}`);
}
