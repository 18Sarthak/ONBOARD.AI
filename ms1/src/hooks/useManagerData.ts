import { useQueries, useQuery } from "@tanstack/react-query";
import { getLogs } from "@/api/logs";
import { getRequest } from "@/api/requests";
import type { OnboardingRequest } from "@/api/types";

export function useLogsPolling() {
  return useQuery({
    queryKey: ["logs", "all"],
    queryFn: () => getLogs(),
    refetchInterval: 5000,
  });
}

export function useKnownRequests(requestIds: string[]) {
  const results = useQueries({
    queries: requestIds.map((id) => ({
      queryKey: ["request", id],
      queryFn: () => getRequest(id),
      refetchInterval: 5000,
      retry: 0,
    })),
  });

  const requests = results
    .map((r) => r.data)
    .filter((r): r is OnboardingRequest => Boolean(r))
    .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());

  return {
    requests,
    isLoading: results.some((r) => r.isLoading),
  };
}
