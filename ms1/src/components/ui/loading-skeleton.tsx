export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/5 ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#13131a] p-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-3 h-3 w-64" />
      <Skeleton className="mt-6 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-5/6" />
      <div className="mt-6 flex gap-3">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
