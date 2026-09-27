import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { EmptyState } from '@myfit/ui/summary';
import { Button } from '@myfit/ui/button';
export const metadata = { title: '설정' };
export default function Page() {
  return (
    <main id="main-content" className="page-content">
      <h1>설정</h1>
      <div className="mt-8 rounded-xl border bg-surface">
        <EmptyState
          icon={<ClipboardList className="size-6" />}
          title="설정 기능을 준비하고 있어요"
          description="기록 기능이 연결되면 이곳에서 나의 기록을 관리할 수 있어요."
          action={
            <Button variant="outline" asChild>
              <Link href="/">오늘로 돌아가기</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
