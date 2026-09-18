import { useQuery } from "@tanstack/react-query";
import { getRequest } from "@/api/requests";
import { ApiError } from "@/api/client";

const TERMINAL = ["approved", "escalated", "done"];

export function useRequestPolling(requestId: string | null) {
  return useQuery({
    queryKey: ["request", requestId],
    queryFn: () => getRequest(requestId!),
    enabled: Boolean(requestId),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL.includes(status)) return false;
      return 3000;
    },
  });
}

export const REQUEST_STORAGE_KEY = "onboardflow_request_id";
