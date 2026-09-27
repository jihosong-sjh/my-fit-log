'use client';
import { DraftBanner } from '@/components/workout/draft-banner';
import { useState } from 'react';
import Link from 'next/link';
import { Dumbbell, Activity } from 'lucide-react';
import type { CardioRecord, WorkoutRecord, RoutineRecord } from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { DatePicker } from '@myfit/ui/fields';
import { Card, CardContent } from '@myfit/ui/card';
import { EmptyState } from '@myfit/ui/summary';
import { useResource } from '@/lib/use-resource';
import { LoadingState, ErrorState } from '../resource-state';
export function WorkoutList({ history = false }: { history?: boolean }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const query = new URLSearchParams();
  if (from) query.set('from', from);
  if (to) query.set('to', to);
  const strength = useResource<WorkoutRecord[]>(`/workouts?${query}`);
  const cardio = useResource<CardioRecord[]>(`/cardio?${query}`);
  const { data: routines } = useResource<RoutineRecord[]>('/routines');
  const workouts = history ? strength.data : strength.data?.slice(0, 5);
  const cardioRows = history ? cardio.data : cardio.data?.slice(0, 5);
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <DraftBanner />
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <h1>{history ? '운동 이력' : '운동'}</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/workout/new">운동 시작</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/workout/cardio/new">유산소 기록</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/routines">루틴 관리</Link>
          </Button>
        </div>
      </div>
      {history ? (
        <div className="mb-6 grid max-w-xl grid-cols-2 gap-4">
          <div>
            <label htmlFor="history-from" className="mb-2 block">
              시작일
            </label>
            <DatePicker
              id="history-from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="history-to" className="mb-2 block">
              종료일
            </label>
            <DatePicker
              id="history-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/workout/history"
            className="underline underline-offset-4"
          >
            전체 운동 이력
          </Link>
          {routines?.slice(0, 3).map((r) => (
            <Button key={r.id} variant="secondary" asChild>
              <Link href={`/workout/new?routine=${r.id}`}>{r.name} 시작</Link>
            </Button>
          ))}
        </div>
      )}
      <div className="grid gap-7 xl:grid-cols-2">
        <section>
          <h2 className="mb-4">웨이트 기록</h2>
          {strength.error && (
            <ErrorState message={strength.error} retry={strength.reload} />
          )}{' '}
          {strength.loading && !workouts ? (
            <LoadingState />
          ) : workouts?.length ? (
            <div className="space-y-3">
              {workouts.map((w) => (
                <Card key={w.id} className="shadow-none">
                  <CardContent>
                    <Link href={`/workout/${w.id}`} className="block">
                      <div className="flex items-center justify-between gap-3">
                        <h3>{w.date}</h3>
                        <span
                          className={`caption ${w.status === 'COMPLETED' ? 'text-success' : 'text-warning'}`}
                        >
                          {w.status === 'COMPLETED' ? '완료' : '작성 중'}
                        </span>
                      </div>
                      <p className="mt-2">
                        {w.exercises
                          .map((e) => e.exerciseNameSnapshot)
                          .join(', ') || '운동 종목을 추가해주세요'}
                      </p>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {w.totalSets}세트 · {w.volume} kg ·{' '}
                        {w.durationSeconds === null
                          ? '진행 중'
                          : `${Math.floor(w.durationSeconds / 60)}분`}
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
                title="아직 운동 기록이 없어요"
                description="첫 운동을 시작하고 세트를 기록해보세요."
                action={
                  <Button asChild>
                    <Link href="/workout/new">첫 운동 시작</Link>
                  </Button>
                }
              />
            </Card>
          )}
        </section>
        <section>
          <h2 className="mb-4">유산소 기록</h2>
          {cardio.error && (
            <ErrorState message={cardio.error} retry={cardio.reload} />
          )}{' '}
          {cardio.loading && !cardioRows ? (
            <LoadingState />
          ) : cardioRows?.length ? (
            <div className="space-y-3">
              {cardioRows.map((c) => (
                <Card key={c.id} className="shadow-none">
                  <CardContent>
                    <Link href={`/workout/cardio/${c.id}`} className="block">
                      <div className="flex items-center justify-between gap-2">
                        <h3>{c.exerciseNameSnapshot}</h3>
                        <span className="caption">{c.date}</span>
                      </div>
                      <p className="mt-3 text-sm text-muted-foreground">
                        {Math.floor(c.durationSeconds / 60)}분{' '}
                        {c.durationSeconds % 60}초
                        {c.distanceKm ? ` · ${c.distanceKm} km` : ''}
                        {c.repetitions ? ` · ${c.repetitions}회` : ''}
                        {c.paceSecondsPerKm
                          ? ` · ${Math.floor(Number(c.paceSecondsPerKm) / 60)}:${String(Math.round(Number(c.paceSecondsPerKm)) % 60).padStart(2, '0')} /km`
                          : ''}
                      </p>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-none">
              <EmptyState
                icon={<Activity />}
                title="유산소 기록이 없어요"
                description="러닝, 걷기, 줄넘기 시간을 기록해보세요."
                action={
                  <Button variant="outline" asChild>
                    <Link href="/workout/cardio/new">유산소 기록하기</Link>
                  </Button>
                }
              />
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
