import { apiFetch } from "./client";
import type { OnboardingRequest } from "./types";

export function createRequest(input: { employeeName: string; message: string }) {
  return apiFetch<{ requestId: string }>("/api/requests", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getRequest(id: string) {
  return apiFetch<OnboardingRequest>(`/api/requests/${id}`);
}

export function approveRequest(id: string, approverRole: string) {
  return apiFetch<{ message: string; requestId: string }>(`/api/requests/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ approverRole }),
  });
}

export function rejectRequest(id: string, approverRole: string, reason: string) {
  return apiFetch<{ message: string; requestId: string }>(`/api/requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ approverRole, reason }),
  });
}
