import { apiFetch } from "./client";

export function runSweep() {
  return apiFetch<{ message: string; escalated: number; checked: number }>("/api/agent/run", {
    method: "POST",
  });
}
