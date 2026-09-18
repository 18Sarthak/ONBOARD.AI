import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { RequestForm } from "@/components/employee/RequestForm";
import {
  EmptyTracker,
  ErrorTracker,
  StatusTracker,
  TrackerSkeleton,
} from "@/components/employee/StatusTracker";
import { createRequest } from "@/api/requests";
import { ApiError } from "@/api/client";
import { REQUEST_STORAGE_KEY, useRequestPolling } from "@/hooks/useRequestPolling";

export function EmployeePage() {
  const [requestId, setRequestId] = useState<string | null>(null);

  // On mount: always clear any stale stored ID so the form starts fresh.
  // Users can only track a request that was submitted in THIS session.
  useEffect(() => {
    window.localStorage.removeItem(REQUEST_STORAGE_KEY);
  }, []);

  const query = useRequestPolling(requestId);

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess: ({ requestId: id }) => {
      window.localStorage.setItem(REQUEST_STORAGE_KEY, id);
      setRequestId(id);
      toast.success("Request sent to the AI agent.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clear = () => {
    window.localStorage.removeItem(REQUEST_STORAGE_KEY);
    setRequestId(null);
    mutation.reset();
  };

  const notFound = query.error instanceof ApiError && query.error.status === 404;

  // Lock the form only while the mutation is in-flight (API call pending).
  // Once we have a requestId + status, only lock for active statuses.
  const fetchedStatus = query.data?.status;
  const isActivelyProcessing =
    mutation.isPending ||
    (Boolean(requestId) &&
      fetchedStatus !== undefined &&
      (fetchedStatus === "draft" || fetchedStatus === "pending_approval"));

  return (
    <div className="animate-fade-in mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-[#f1f0ff]">Employee Portal</h1>
      <p className="mt-1 text-sm text-[#6b6b8a]">
        Acme Corp onboarding, handled end-to-end by your AI agent.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-5">
        <div className="md:col-span-2">
          <RequestForm
            onSubmit={(v) => mutation.mutate(v)}
            isSubmitting={mutation.isPending}
            disabled={isActivelyProcessing}
          />
          {requestId && !isActivelyProcessing && (
            <button
              type="button"
              aria-label="Clear tracked request and start over"
              onClick={clear}
              className="mt-3 text-xs text-[#a855f7] transition-colors hover:text-[#c084fc]"
            >
              Clear / start over
            </button>
          )}
        </div>

        <div className="md:col-span-3">
          {!requestId ? (
            <EmptyTracker />
          ) : notFound ? (
            <ErrorTracker message="Request not found." onRetry={clear} />
          ) : query.error ? (
            <ErrorTracker message={query.error.message} onRetry={() => query.refetch()} />
          ) : query.data ? (
            <StatusTracker request={query.data} onClear={clear} />
          ) : (
            <TrackerSkeleton />
          )}
        </div>
      </div>
    </div>
  );
}
