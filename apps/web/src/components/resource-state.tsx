'use client';
import { Button } from '@myfit/ui/button';
import { Skeleton } from '@myfit/ui/skeleton';
export function LoadingState() {
  return (
    <div role="status" aria-label="불러오는 중" className="space-y-4 py-6">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-40 w-full" />
      <span className="sr-only">불러오는 중입니다.</span>
    </div>
  );
}
export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className="my-5 rounded-xl border border-danger/30 p-5">
      <p role="alert" className="text-danger">
        {message}
      </p>
      <Button variant="outline" className="mt-3" onClick={retry}>
        다시 시도
      </Button>
    </div>
  );
}
