import Link from 'next/link';
import { Button } from '@myfit/ui/button';
export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <h1>페이지를 찾을 수 없어요</h1>
      <p className="mt-4 text-muted-foreground">
        주소를 확인하거나 오늘의 기록으로 돌아가세요.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/dashboard">오늘의 기록</Link>
      </Button>
    </main>
  );
}
