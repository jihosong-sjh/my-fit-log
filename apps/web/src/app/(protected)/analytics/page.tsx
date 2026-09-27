'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  localDate,
  periodStart,
  type AnalyticsData,
  type Period,
  type WorkoutSetInput,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { DatePicker } from '@myfit/ui/fields';
import { Card, CardHeader, CardTitle, CardContent } from '@myfit/ui/card';
import { EmptyState, StatCard } from '@myfit/ui/summary';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@myfit/ui/tabs';
import { TrendChart } from '@/components/trend-chart';
import { ErrorState, LoadingState } from '@/components/resource-state';
import { useResource } from '@/lib/use-resource';
import { numberText, minutesText, paceText } from '@/lib/format';
const chartNumber = (value: string | number | null) =>
  value === null ? null : Number(Number(value).toFixed(2));
function Charts({ data }: { data: AnalyticsData }) {
  const [exerciseId, setExerciseId] = useState('');
  const [cardioId, setCardioId] = useState('');
  const exercise =
    data.workout.exerciseTrends.find((e) => e.exerciseId === exerciseId) ??
    data.workout.exerciseTrends[0];
  const cardio =
    data.cardio.find((c) => c.exerciseId === cardioId) ?? data.cardio[0];
  const previous = useResource<{
    sets: WorkoutSetInput[];
    workoutSession: { date: string };
  } | null>(exercise ? `/exercises/${exercise.exerciseId}/previous` : null);
  const cardioPrevious = useResource<
    {
      id: string;
      date: string;
      durationSeconds: number;
      distanceKm: string | null;
      repetitions: number | null;
    }[]
  >(cardio ? `/exercises/${cardio.exerciseId}/previous` : null);
  return (
    <Tabs defaultValue="weight">
      <TabsList aria-label="분석 종류" className="mb-5">
        <TabsTrigger value="weight">체중</TabsTrigger>
        <TabsTrigger value="workout">웨이트</TabsTrigger>
        <TabsTrigger value="nutrition">영양</TabsTrigger>
        <TabsTrigger value="cardio">유산소</TabsTrigger>
      </TabsList>
      <TabsContent value="weight" className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="시작 체중"
            value={data.weight.start}
            unit="kg"
            description="선택 기간 첫 측정"
          />
          <StatCard
            title="최근 체중"
            value={data.weight.current?.weight ?? null}
            unit="kg"
            description={data.weight.current?.date ?? '미기록'}
          />
          <StatCard
            title="체중 변화"
            value={numberText(data.weight.difference)}
            unit="kg"
            description="선택 기간 마지막 − 첫 측정"
          />
        </div>
        <Card className="min-w-0 shadow-none">
          <CardHeader>
            <CardTitle>체중과 7일 평균</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendChart
              title="체중 추세"
              data={data.weight.series.map((p) => ({
                date: p.date,
                weight: chartNumber(p.weight),
                average: chartNumber(p.average),
              }))}
              series={[
                { key: 'weight', label: '체중 (kg)' },
                { key: 'average', label: '7일 평균 (kg)' },
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="workout" className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="완료한 웨이트"
            value={String(data.workout.workoutCount)}
            unit="회"
            description={`${data.workout.workoutDays}일 운동 (유산소 포함)`}
          />
          <StatCard
            title="운동 시간"
            value={minutesText(data.workout.durationSeconds)}
            description="웨이트 + 유산소"
          />
          <StatCard
            title="완료 세트 볼륨"
            value={numberText(data.workout.volume)}
            unit="kg"
            description="완료한 웨이트 기준"
          />
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="min-w-0 shadow-none">
            <CardHeader>
              <CardTitle>주간 운동 횟수</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                kind="bar"
                title="주간 운동 횟수"
                data={
                  data.workout.workoutCount || data.workout.cardioCount
                    ? data.workout.weekly.map((w) => ({
                        date: w.date,
                        strength: w.workoutCount,
                        cardio: w.cardioCount,
                      }))
                    : []
                }
                series={[
                  { key: 'strength', label: '웨이트 (회)' },
                  { key: 'cardio', label: '유산소 (회)' },
                ]}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 shadow-none">
            <CardHeader>
              <CardTitle>주간 운동 시간</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                kind="bar"
                title="주간 운동 시간"
                data={
                  data.workout.workoutCount || data.workout.cardioCount
                    ? data.workout.weekly.map((w) => ({
                        date: w.date,
                        minutes: w.durationSeconds / 60,
                      }))
                    : []
                }
                series={[{ key: 'minutes', label: '시간 (분)' }]}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 shadow-none">
            <CardHeader>
              <CardTitle>주간 볼륨</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                kind="bar"
                title="주간 볼륨"
                data={
                  data.workout.workoutCount
                    ? data.workout.weekly.map((w) => ({
                        date: w.date,
                        volume: Number(w.volume),
                      }))
                    : []
                }
                series={[{ key: 'volume', label: '볼륨 (kg)' }]}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 shadow-none">
            <CardHeader>
              <CardTitle>종목별 최대 중량</CardTitle>
            </CardHeader>
            <CardContent>
              {exercise ? (
                <>
                  <label htmlFor="analytics-exercise" className="sr-only">
                    중량 추세 종목
                  </label>
                  <select
                    id="analytics-exercise"
                    className="mb-4 h-11 w-full rounded-md border bg-surface px-3"
                    value={exercise.exerciseId}
                    onChange={(e) => setExerciseId(e.target.value)}
                  >
                    {data.workout.exerciseTrends.map((e) => (
                      <option key={e.exerciseId} value={e.exerciseId}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                  <TrendChart
                    title="종목별 최대 중량"
                    data={exercise.points.map((p) => ({
                      date: p.date,
                      weight: chartNumber(p.weight),
                    }))}
                    series={[{ key: 'weight', label: '외부 중량 (kg)' }]}
                  />
                  <p className="mt-3 caption">
                    최근 완료 기록:{' '}
                    {previous.data
                      ? `${previous.data.workoutSession.date.slice(0, 10)} · ${previous.data.sets.map((s) => `${s.weight}kg × ${s.reps}`).join(' / ')}`
                      : '—'}
                  </p>
                </>
              ) : (
                <EmptyState
                  title="완료한 웨이트가 없어요"
                  description="운동을 완료하면 중량 추세를 확인할 수 있어요."
                />
              )}
            </CardContent>
          </Card>
        </div>
        <p className="caption">
          주간 막대는 선택 기간 안의 기록만 집계합니다. 맨몸 중량은 외부 중량
          0kg입니다.
        </p>
      </TabsContent>
      <TabsContent value="nutrition" className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="평균 열량"
            value={numberText(data.nutrition.averageCalories)}
            unit="kcal"
            description={`식사 기록 ${data.nutrition.recordedDays}일 기준`}
          />
          <StatCard
            title="평균 단백질"
            value={numberText(data.nutrition.averageProtein)}
            unit="g"
            description="미기록일 제외"
          />
          <StatCard
            title="열량 목표 달성률"
            value={numberText(data.nutrition.goalAchievement)}
            unit="%"
            description="현재 설정한 목표 기준"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          과거 기간도 현재 목표 기준입니다. 목표 미설정 시 달성률을 표시하지
          않습니다.{' '}
          <Link href="/settings" className="underline">
            목표 설정
          </Link>
        </p>
        <div className="grid gap-5 xl:grid-cols-2">
          <Card className="min-w-0 shadow-none">
            <CardHeader>
              <CardTitle>일일 열량</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                title="일일 열량"
                data={data.nutrition.series.map((p) => ({
                  date: p.date,
                  calories: chartNumber(p.calories),
                }))}
                series={[{ key: 'calories', label: '열량 (kcal)' }]}
              />
            </CardContent>
          </Card>
          <Card className="min-w-0 shadow-none">
            <CardHeader>
              <CardTitle>일일 단백질</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart
                title="일일 단백질"
                data={data.nutrition.series.map((p) => ({
                  date: p.date,
                  protein: chartNumber(p.protein),
                }))}
                series={[{ key: 'protein', label: '단백질 (g)' }]}
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="cardio" className="space-y-5">
        {cardio ? (
          <>
            <label htmlFor="analytics-cardio" className="block">
              유산소 종목
            </label>
            <select
              id="analytics-cardio"
              className="h-11 w-full max-w-sm rounded-md border bg-surface px-3"
              value={cardio.exerciseId}
              onChange={(e) => setCardioId(e.target.value)}
            >
              {data.cardio.map((c) => (
                <option key={c.exerciseId} value={c.exerciseId}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard
                title="운동 시간"
                value={minutesText(cardio.durationSeconds)}
                description={cardio.name}
              />
              {cardio.mode === 'DISTANCE' ? (
                <>
                  <StatCard
                    title="총 거리"
                    value={cardio.distanceKm}
                    unit="km"
                    description="거리 입력이 있는 기록"
                  />
                  <StatCard
                    title="평균 pace"
                    value={paceText(cardio.paceSecondsPerKm)}
                    unit="/km"
                    description="거리가 있는 기록의 시간 / 거리"
                  />
                </>
              ) : cardio.mode === 'REPETITIONS' ? (
                <StatCard
                  title="총 횟수"
                  value={numberText(cardio.repetitions, 0)}
                  unit="회"
                  description="횟수를 입력한 기록"
                />
              ) : null}
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              <Card className="min-w-0 shadow-none">
                <CardHeader>
                  <CardTitle>유산소 시간 추세</CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart
                    title="유산소 시간"
                    data={cardio.points.map((p) => ({
                      date: p.date,
                      minutes:
                        p.durationSeconds === null
                          ? null
                          : p.durationSeconds / 60,
                    }))}
                    series={[{ key: 'minutes', label: '시간 (분)' }]}
                  />
                </CardContent>
              </Card>
              {cardio.mode !== 'DURATION' && (
                <Card className="min-w-0 shadow-none">
                  <CardHeader>
                    <CardTitle>
                      {cardio.mode === 'DISTANCE' ? '거리 추세' : '횟수 추세'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TrendChart
                      title={
                        cardio.mode === 'DISTANCE'
                          ? '유산소 거리'
                          : '줄넘기 횟수'
                      }
                      data={cardio.points.map((p) => ({
                        date: p.date,
                        value:
                          cardio.mode === 'DISTANCE'
                            ? chartNumber(p.distanceKm)
                            : p.repetitions,
                      }))}
                      series={[
                        {
                          key: 'value',
                          label:
                            cardio.mode === 'DISTANCE'
                              ? '거리 (km)'
                              : '횟수 (회)',
                        },
                      ]}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>종목별 최근 기록</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {cardioPrevious.data?.map((record) => (
                    <li key={record.id}>
                      <Link
                        href={`/workout/cardio/${record.id}`}
                        className="underline underline-offset-4"
                      >
                        {record.date.slice(0, 10)} ·{' '}
                        {minutesText(record.durationSeconds)}
                        {record.distanceKm ? ` · ${record.distanceKm}km` : ''}
                        {record.repetitions ? ` · ${record.repetitions}회` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="shadow-none">
            <EmptyState
              title="유산소 기록이 없어요"
              description="선택한 기간의 유산소 기록을 추가해보세요."
              action={
                <Button asChild>
                  <Link href="/workout/cardio/new">유산소 기록</Link>
                </Button>
              }
            />
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
export default function AnalyticsPage() {
  const [end, setEnd] = useState(() => localDate(new Date()));
  const [period, setPeriod] = useState<Period>('30D');
  const { data, error, loading, reload } = useResource<AnalyticsData>(
    `/analytics?from=${periodStart(end, period)}&to=${end}`,
  );
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <h1 className="mb-6">변화 살펴보기</h1>
      <div className="mb-7 flex flex-wrap items-end gap-4">
        <div className="flex flex-wrap gap-1">
          {(['7D', '30D', '3M', '6M', '1Y'] as Period[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={p === period ? 'secondary' : 'outline'}
              aria-pressed={p === period}
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <div>
          <label htmlFor="analytics-end" className="mb-1 block caption">
            조회 기준일
          </label>
          <DatePicker
            id="analytics-end"
            value={end}
            onChange={(e) => {
              if (e.target.value) setEnd(e.target.value);
            }}
          />
        </div>
      </div>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {loading && !data ? <LoadingState /> : data && <Charts data={data} />}
    </main>
  );
}
