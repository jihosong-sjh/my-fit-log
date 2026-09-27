'use client';
import Link from 'next/link';
import { Dumbbell, Activity, Layers } from 'lucide-react';
import { localDate, type WorkoutRecord } from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { Card, CardContent } from '@myfit/ui/card';
import { EmptyState, StatCard } from '@myfit/ui/summary';
import { useResource } from '@/lib/use-resource';
import { QuickWeight } from '@/components/body/quick-weight';
import { ErrorState, LoadingState } from '@/components/resource-state';
type Dashboard = {
  date: string;
  today: {
    workoutCount: number;
    cardioCount: number;
    durationSeconds: number;
    totalSets: number;
    volume: string;
  };
  recentWorkout: WorkoutRecord[];
};
export default function DashboardPage() {
  const { data, error, loading, reload } = useResource<Dashboard>(
    `/dashboard?date=${localDate(new Date())}`,
  );
  return (
    <main id="main-content" className="page-content">
      <div className="mb-7 flex flex-wrap justify-between gap-4">
        <div>
          <p className="mb-2 text-muted-foreground">오늘도, 나의 속도로</p>
          <h1>오늘의 기록</h1>
        </div>
        <Button asChild>
          <Link href="/workout/new">운동 시작</Link>
        </Button>
      </div>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {loading && !data ? (
        <LoadingState />
      ) : (
        data && (
          <>
            <section
              className="grid gap-4 lg:grid-cols-3"
              aria-label="오늘의 운동 요약"
            >
              <StatCard
                title="운동 시간"
                value={String(Math.floor(data.today.durationSeconds / 60))}
                unit="분"
                description={`웨이트 ${data.today.workoutCount}회 · 유산소 ${data.today.cardioCount}회`}
                icon={<Activity />}
              />
              <StatCard
                title="완료 세트"
                value={String(data.today.totalSets)}
                unit="세트"
                description="완료한 웨이트 운동 기준"
                icon={<Layers />}
              />
              <StatCard
                title="총 볼륨"
                value={data.today.volume}
                unit="kg"
                description="완료 세트의 외부 중량 × 횟수"
                icon={<Dumbbell />}
              />
            </section>
            <section className="mt-8">
              <h2 className="mb-4">오늘 완료한 웨이트</h2>
              {data.recentWorkout.length ? (
                <div className="space-y-3">
                  {data.recentWorkout.map((w) => (
                    <Card className="shadow-none" key={w.id}>
                      <CardContent>
                        <Link href={`/workout/${w.id}`} className="block">
                          <h3>
                            {w.exercises
                              .map((e) => e.exerciseNameSnapshot)
                              .join(', ')}
                          </h3>
                          <p className="mt-2 text-muted-foreground">
                            {w.totalSets}세트 · {w.volume} kg ·{' '}
                            {Math.floor((w.durationSeconds ?? 0) / 60)}분
                          </p>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="shadow-none">
                  <EmptyState
                    icon={<Dumbbell />}
                    title="아직 완료한 운동이 없어요"
                    description="오늘의 첫 운동을 기록해보세요."
                    action={
                      <Button asChild>
                        <Link href="/workout/new">첫 운동 시작</Link>
                      </Button>
                    }
                  />
                </Card>
              )}
            </section>
          </>
        )
      )}
      <Card className="mt-7 max-w-xl shadow-none">
        <CardContent>
          <QuickWeight />
        </CardContent>
      </Card>
    </main>
  );
}
