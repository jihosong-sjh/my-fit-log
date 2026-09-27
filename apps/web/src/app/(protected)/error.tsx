'use client';
import Link from 'next/link';
import { Button } from '@myfit/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <h1>화면을 불러오지 못했어요</h1>
      <p className="mt-4 text-muted-foreground">
        연결을 확인한 후 다시 시도해주세요. 운동의 기기 임시 기록은 유지됩니다.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset}>다시 시도</Button>
        <Button variant="outline" asChild>
          <Link href="/login">다시 로그인</Link>
        </Button>
      </div>
    </main>
  );
}
