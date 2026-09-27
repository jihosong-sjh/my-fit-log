'use client';
import { DraftBanner } from '@/components/workout/draft-banner';
import { useState } from 'react';
import Link from 'next/link';
import { Activity, Flame, Scale, Dumbbell } from 'lucide-react';
import { localDate, type DashboardData } from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { DatePicker } from '@myfit/ui/fields';
import { Card, CardHeader, CardTitle, CardContent } from '@myfit/ui/card';
import { EmptyState, ProgressCircle, StatCard } from '@myfit/ui/summary';
import { Progress } from '@myfit/ui/progress';
import { useResource } from '@/lib/use-resource';
import { ErrorState, LoadingState } from '@/components/resource-state';
import { QuickWeight } from '@/components/body/quick-weight';
import { TrendChart } from '@/components/trend-chart';
import { numberText, minutesText } from '@/lib/format';
export default function DashboardPage() {
  const [date, setDate] = useState(() => localDate(new Date()));
  const { data, error, loading, reload } = useResource<DashboardData>(
    `/dashboard?date=${date}`,
  );
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <DraftBanner />
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-muted-foreground">오늘도, 나의 속도로</p>
          <h1>오늘의 기록</h1>
        </div>
        <div>
          <label htmlFor="dashboard-date" className="mb-1 block caption">
            기록일
          </label>
          <DatePicker
            id="dashboard-date"
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
            }}
          />
        </div>
      </div>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {loading && !data ? (
        <LoadingState />
      ) : (
        data && (
          <>
            <section
              className="grid grid-cols-2 gap-3 xl:grid-cols-4"
              aria-label="오늘의 요약"
            >
              <StatCard
                title="운동 시간"
                value={String(Math.floor(data.today.durationSeconds / 60))}
                unit="분"
                description={`웨이트 ${data.today.workoutCount}회 · 유산소 ${data.today.cardioCount}회`}
                icon={<Activity className="size-5" />}
              />
              <StatCard
                title="섭취 열량"
                value={
                  data.nutrition.recorded
                    ? numberText(data.nutrition.totals.calories)
                    : null
                }
                unit="kcal"
                description={
                  data.goals.dailyCalories
                    ? `목표 ${numberText(data.goals.dailyCalories)} kcal`
                    : '목표 미설정'
                }
                icon={<Flame className="size-5" />}
              />
              <StatCard
                title="단백질"
                value={
                  data.nutrition.recorded
                    ? numberText(data.nutrition.totals.protein)
                    : null
                }
                unit="g"
                description={
                  data.goals.proteinGoal
                    ? `목표 ${numberText(data.goals.proteinGoal)} g`
                    : '목표 미설정'
                }
              />
              <StatCard
                title="최근 체중"
                value={data.body.current?.weight ?? null}
                unit="kg"
                description={
                  data.body.current
                    ? `${data.body.current.date} 측정`
                    : '첫 측정을 기다리고 있어요'
                }
                icon={<Scale className="size-5" />}
              />
            </section>
            <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Card className="shadow-none">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>영양 목표</CardTitle>
                  <Link
                    href="/settings"
                    className="caption underline underline-offset-4"
                  >
                    목표 설정
                  </Link>
                </CardHeader>
                <CardContent className="space-y-5">
                  {(
                    [
                      ['calories', '열량', 'kcal', 'dailyCalories'],
                      ['protein', '단백질', 'g', 'proteinGoal'],
                      ['carbs', '탄수화물', 'g', 'carbGoal'],
                      ['fat', '지방', 'g', 'fatGoal'],
                    ] as const
                  ).map(([key, label, unit, goalKey]) => (
                    <div key={key}>
                      <div className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                        <span>{label}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {data.nutrition.recorded
                            ? numberText(data.nutrition.totals[key])
                            : '—'}{' '}
                          / {numberText(data.goals[goalKey])} {unit}
                        </span>
                      </div>
                      {data.goals[goalKey] === null ? (
                        <p className="caption">목표를 설정해주세요.</p>
                      ) : (
                        <>
                          <Progress
                            aria-label={`${label} 목표 진행률`}
                            value={
                              data.nutrition.progress[key] === null
                                ? null
                                : Number(data.nutrition.progress[key])
                            }
                          />
                          <p className="mt-1 caption">
                            {data.nutrition.progress[key] === null
                              ? '식단을 기록하면 진행률을 볼 수 있어요.'
                              : `${numberText(data.nutrition.progress[key])}% · 현재 목표 기준`}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle>이번 주 운동</CardTitle>
                  <p className="caption">
                    {data.weekly.from} ~ {data.weekly.to}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-5">
                    <ProgressCircle
                      value={
                        data.weekly.goalPercentage === null
                          ? null
                          : Number(
                              Number(data.weekly.goalPercentage).toFixed(1),
                            )
                      }
                      label="주간 운동일 목표"
                    />
                    <div>
                      <p className="text-2xl font-semibold tabular-nums">
                        {data.weekly.workoutDays}{' '}
                        <span className="text-sm font-normal text-muted-foreground">
                          / {data.goals.weeklyWorkoutGoal ?? '—'}일
                        </span>
                      </p>
                      <p className="mt-1 caption">
                        웨이트와 유산소를 한 날은 1일
                      </p>
                      {data.goals.weeklyWorkoutGoal === null && (
                        <Link className="caption underline" href="/settings">
                          운동일 목표 설정
                        </Link>
                      )}
                    </div>
                  </div>
                  <dl className="mt-6 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">완료한 웨이트</dt>
                      <dd>{data.weekly.workoutCount}회</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">총 운동 시간</dt>
                      <dd>{minutesText(data.weekly.durationSeconds)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">
                        완료 세트 / 볼륨
                      </dt>
                      <dd>
                        {data.weekly.totalSets}세트 /{' '}
                        {numberText(data.weekly.volume)} kg
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </section>
            <section className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
              <Card className="min-w-0 shadow-none">
                <CardHeader>
                  <CardTitle>최근 7일 체중</CardTitle>
                  <p className="caption">
                    평균 {numberText(data.body.average)} kg · 이전 7일 평균 대비{' '}
                    {numberText(data.body.previousPeriodChange)} kg
                  </p>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    title="최근 7일 체중"
                    data={data.body.trend.map((p) => ({
                      date: p.date,
                      weight: p.weight === null ? null : Number(p.weight),
                      average:
                        p.average === null
                          ? null
                          : Number(Number(p.average).toFixed(2)),
                    }))}
                    series={[
                      { key: 'weight', label: '체중 (kg)' },
                      { key: 'average', label: '7일 평균 (kg)' },
                    ]}
                  />
                </CardContent>
              </Card>
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle>이번 주 식단과 신체</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-4">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">평균 열량</dt>
                      <dd>{numberText(data.weekly.averageCalories)} kcal</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">평균 단백질</dt>
                      <dd>{numberText(data.weekly.averageProtein)} g</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">체중 변화</dt>
                      <dd>{numberText(data.weekly.weightChange)} kg</dd>
                    </div>
                  </dl>
                  <p className="mt-4 caption">
                    식단 기록 {data.weekly.recordedDays}일 기준 · 미기록일은
                    평균에서 제외
                  </p>
                  <div className="mt-6 border-t pt-5">
                    <QuickWeight date={date} />
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="mt-8" aria-label="오늘의 운동 요약">
              <div className="mb-4 flex items-center justify-between">
                <h2>최근 완료한 운동</h2>
                <Link href="/workout/history" className="caption underline">
                  전체 이력
                </Link>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">
                {date} 완료 {data.today.totalSets}세트 ·{' '}
                {numberText(data.today.volume)} kg
              </p>
              {data.recentWorkout.length ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {data.recentWorkout.map((w) => (
                    <Card className="shadow-none" key={w.id}>
                      <CardContent>
                        <Link href={`/workout/${w.id}`} className="block">
                          <p className="caption">{w.date}</p>
                          <h3 className="mt-2">
                            {w.exercises
                              .map((e) => e.exerciseNameSnapshot)
                              .join(', ')}
                          </h3>
                          <p className="mt-3 text-muted-foreground">
                            {w.totalSets}세트 · {numberText(w.volume)} kg ·{' '}
                            {minutesText(w.durationSeconds ?? 0)}
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
    </main>
  );
}
