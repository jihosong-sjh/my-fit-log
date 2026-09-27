'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import {
  localDate,
  parseDate,
  MEAL_LABELS,
  type CalendarMonth,
  type CalendarDay,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { Input } from '@myfit/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@myfit/ui/card';
import { EmptyState } from '@myfit/ui/summary';
import { cn } from '@myfit/ui/utils';
import { useResource } from '@/lib/use-resource';
import { ErrorState, LoadingState } from '@/components/resource-state';
import { minutesText, numberText } from '@/lib/format';
function shiftMonth(month: string, amount: number) {
  const date = parseDate(`${month}-01`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
export default function CalendarPage() {
  const today = localDate(new Date());
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const calendar = useResource<CalendarMonth>(`/calendar?month=${month}`);
  const detail = useResource<CalendarDay>(`/calendar/day?date=${selected}`);
  const offset = (parseDate(`${month}-01`).getUTCDay() + 6) % 7;
  const chooseMonth = (value: string) => {
    setMonth(value);
    setSelected(value === today.slice(0, 7) ? today : `${value}-01`);
  };
  return (
    <main id="main-content" className="page-content">
      <h1 className="mb-7">기록 캘린더</h1>
      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card className="min-w-0 shadow-none">
          <CardContent className="px-0 sm:px-6">
            <div className="mb-5 flex items-center justify-between gap-2 px-2 sm:px-0">
              <Button
                variant="ghost"
                size="icon"
                aria-label="이전 달"
                onClick={() => chooseMonth(shiftMonth(month, -1))}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <div>
                <label htmlFor="calendar-month" className="sr-only">
                  조회 월
                </label>
                <Input
                  id="calendar-month"
                  type="month"
                  value={month}
                  onChange={(e) => {
                    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))
                      chooseMonth(e.target.value);
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="다음 달"
                onClick={() => chooseMonth(shiftMonth(month, 1))}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center caption">
              {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            {calendar.error && (
              <ErrorState message={calendar.error} retry={calendar.reload} />
            )}{' '}
            {calendar.loading && !calendar.data ? (
              <LoadingState />
            ) : (
              <div
                className="grid grid-cols-7 gap-1"
                aria-label={`${month} 날짜`}
              >
                {Array.from({ length: offset }, (_, i) => (
                  <span key={`blank-${i}`} aria-hidden="true" />
                ))}
                {calendar.data?.days.map((day) => (
                  <button
                    type="button"
                    key={day.date}
                    aria-label={`${day.date}${day.workout ? ' 운동' : ''}${day.meal ? ' 식단' : ''}${day.body ? ' 신체' : ''}${day.inProgress ? ' 작성 중' : ''}`}
                    aria-pressed={selected === day.date}
                    className={cn(
                      'flex min-h-16 min-w-0 flex-col items-center justify-center gap-2 rounded-lg border border-transparent p-1 text-sm hover:bg-muted sm:min-h-20',
                      day.date === today &&
                        'font-bold text-secondary-foreground',
                      selected === day.date &&
                        'border-brand bg-secondary text-secondary-foreground',
                    )}
                    onClick={() => setSelected(day.date)}
                  >
                    <span>{Number(day.date.slice(-2))}</span>
                    <span aria-hidden="true" className="flex min-h-1.5 gap-1">
                      {day.workout && (
                        <span className="size-1.5 rounded-full bg-brand" />
                      )}
                      {day.meal && (
                        <span className="size-1.5 rounded-full bg-warning" />
                      )}
                      {day.body && (
                        <span className="size-1.5 rounded-full bg-success" />
                      )}
                      {day.inProgress && (
                        <span className="size-1.5 rounded-full border border-brand" />
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-3 px-3 caption">
              <span>
                <span className="mr-1 inline-block size-1.5 rounded-full bg-brand" />
                운동 (유산소 포함)
              </span>
              <span>
                <span className="mr-1 inline-block size-1.5 rounded-full bg-warning" />
                식단
              </span>
              <span>
                <span className="mr-1 inline-block size-1.5 rounded-full bg-success" />
                신체
              </span>
              <span>
                <span className="mr-1 inline-block size-1.5 rounded-full border border-brand" />
                작성 중
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{selected} 기록</CardTitle>
          </CardHeader>
          <CardContent>
            {detail.error && (
              <ErrorState message={detail.error} retry={detail.reload} />
            )}{' '}
            {detail.loading && !detail.data ? (
              <LoadingState />
            ) : (
              detail.data && (
                <>
                  {!detail.data.workouts.length &&
                  !detail.data.cardio.length &&
                  !detail.data.meals.length &&
                  !detail.data.body ? (
                    <EmptyState
                      icon={<CalendarDays />}
                      title="이날은 기록이 없어요"
                      description="운동, 식단, 신체 기록을 남겨보세요."
                    />
                  ) : (
                    <div className="space-y-6">
                      <section>
                        <h3>운동</h3>
                        <ul className="mt-2 space-y-2">
                          {detail.data.workouts.map((w) => (
                            <li key={w.id}>
                              <Link
                                href={`/workout/${w.id}`}
                                className="underline underline-offset-4"
                              >
                                {w.status === 'COMPLETED'
                                  ? '웨이트 완료'
                                  : '웨이트 작성 중'}{' '}
                                · {w.totalSets}세트 · {numberText(w.volume)}kg
                              </Link>
                            </li>
                          ))}
                          {detail.data.cardio.map((c) => (
                            <li key={c.id}>
                              <Link
                                href={`/workout/cardio/${c.id}`}
                                className="underline underline-offset-4"
                              >
                                {c.exerciseNameSnapshot} ·{' '}
                                {minutesText(c.durationSeconds)}
                                {c.distanceKm ? ` · ${c.distanceKm}km` : ''}
                                {c.repetitions ? ` · ${c.repetitions}회` : ''}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        {!detail.data.workouts.length &&
                          !detail.data.cardio.length && (
                            <p className="caption">운동 기록 없음</p>
                          )}
                      </section>
                      <section>
                        <h3>식단</h3>
                        {detail.data.nutrition.recorded ? (
                          <>
                            <p className="mt-2 tabular-nums">
                              {numberText(
                                detail.data.nutrition.totals.calories,
                              )}{' '}
                              kcal · 단백질{' '}
                              {numberText(detail.data.nutrition.totals.protein)}
                              g
                            </p>
                            <ul className="mt-2 space-y-2">
                              {detail.data.meals.map((m) => (
                                <li key={m.id}>
                                  <Link
                                    href={`/diet/${m.id}`}
                                    className="underline underline-offset-4"
                                  >
                                    {MEAL_LABELS[m.mealType]} ·{' '}
                                    {m.foods
                                      .map((f) => f.foodNameSnapshot)
                                      .join(', ')}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <p className="caption">식단 기록 없음</p>
                        )}
                      </section>
                      <section>
                        <h3>신체</h3>
                        {detail.data.body ? (
                          <Link
                            href={`/body?date=${selected}`}
                            className="mt-2 inline-block underline underline-offset-4"
                          >
                            체중 {detail.data.body.weight}kg
                            {detail.data.body.bodyFat
                              ? ` · 체지방 ${detail.data.body.bodyFat}%`
                              : ''}
                          </Link>
                        ) : (
                          <p className="caption">신체 기록 없음</p>
                        )}
                      </section>
                    </div>
                  )}
                  <div className="mt-6 flex flex-wrap gap-2 border-t pt-4">
                    <Button variant="outline" asChild>
                      <Link href={`/workout/new?date=${selected}`}>
                        운동 추가
                      </Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/diet/new?date=${selected}`}>식단 추가</Link>
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/body?date=${selected}`}>신체 기록</Link>
                    </Button>
                  </div>
                </>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
