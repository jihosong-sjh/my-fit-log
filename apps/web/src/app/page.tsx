import Link from 'next/link';
import {
  Dumbbell,
  Utensils,
  Scale,
  ArrowUpRight,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent } from '@myfit/ui/card';
import { Button } from '@myfit/ui/button';
import { StatCard } from '@myfit/ui/summary';
export default function Home() {
  return (
    <main id="main-content" className="page-content">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            오늘도, 나의 속도로
          </p>
          <h1>오늘의 기록</h1>
          <p className="mt-3 text-muted-foreground">
            작은 기록이 쌓여 나의 변화를 보여줄 거예요.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/calendar">
            <CalendarDays aria-hidden="true" />
            캘린더
          </Link>
        </Button>
      </div>
      <section aria-label="오늘의 요약" className="grid gap-4 lg:grid-cols-3">
        <StatCard
          title="운동"
          value={null}
          unit="분"
          description="아직 완료한 운동이 없어요"
          icon={<Dumbbell className="size-5" />}
        />
        <StatCard
          title="섭취 열량"
          value={null}
          unit="kcal"
          description="아직 식단 기록이 없어요"
          icon={<Utensils className="size-5" />}
        />
        <StatCard
          title="최근 체중"
          value={null}
          unit="kg"
          description="첫 측정을 기다리고 있어요"
          icon={<Scale className="size-5" />}
        />
      </section>
      <section className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-0 shadow-none">
          <CardContent className="p-7 md:p-9">
            <div className="mb-7 flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Dumbbell aria-hidden="true" className="size-6" />
            </div>
            <h2>기록할 준비를 하고 있어요</h2>
            <p className="mt-3 max-w-lg leading-relaxed text-muted-foreground">
              운동, 식단, 몸의 변화를 한곳에 모아보세요.
              <br className="hidden lg:block" /> 지금은 편안한 기록 경험을
              준비하고 있어요.
            </p>
            <div className="mt-7 border-t pt-5">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <span className="size-1.5 rounded-full bg-brand" />
                기록 기능 준비 중
              </span>
            </div>
          </CardContent>
        </Card>
        <div className="px-1 py-4">
          <h2>나에게 맞는 목표</h2>
          <p className="mt-3 text-muted-foreground">
            목표를 정하면 하루의 기록을
            <br />더 쉽게 살펴볼 수 있어요.
          </p>
          <p className="mt-6 caption">아직 목표가 설정되지 않았어요.</p>
          <Button variant="link" className="mt-2 px-0" asChild>
            <Link href="/settings">
              설정 살펴보기
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
      <p className="mt-10 caption">
        운동·식단·신체 기록은 아직 저장되지 않습니다.
      </p>
    </main>
  );
}
