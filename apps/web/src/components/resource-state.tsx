'use client';
import Link from 'next/link';
import { Button } from '@myfit/ui/button';
import { Skeleton } from '@myfit/ui/skeleton';
export function LoadingState() {
  return (
    <div
      role="status"
      aria-label="불러오는 중"
      aria-busy="true"
      className="min-h-80 space-y-4 py-6"
    >
      <Skeleton className="h-8 w-1/3" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
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
      {message.includes('로그인') && (
        <Button className="ml-2 mt-3" variant="outline" asChild>
          <Link href="/login">다시 로그인</Link>
        </Button>
      )}
    </div>
  );
}
