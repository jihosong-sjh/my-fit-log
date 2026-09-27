'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  localDate,
  type RoutineRecord,
  type WorkoutPayload,
  type WorkoutRecord,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { DatePicker } from '@myfit/ui/fields';
import { Card, CardContent } from '@myfit/ui/card';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
export function NewWorkout({ routineId = '' }: { routineId?: string }) {
  const router = useRouter();
  const { data: routines } = useResource<RoutineRecord[]>('/routines');
  const [routine, setRoutine] = useState(routineId);
  const [date, setDate] = useState(() => localDate(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Card className="mt-7 max-w-xl shadow-none">
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const source = routines?.find((r) => r.id === routine);
            if (routine && !source) {
              setError('루틴을 불러온 후 다시 시도해주세요.');
              return;
            }
            if (source?.exercises.some((item) => item.exercise.archivedAt)) {
              setError('보관된 종목을 루틴에서 교체한 후 시작해주세요.');
              return;
            }
            setBusy(true);
            setError('');
            try {
              const id = crypto.randomUUID();
              const payload: WorkoutPayload = {
                baseRevision: null,
                mutationId: crypto.randomUUID(),
                date,
                startedAt: new Date().toISOString(),
                endedAt: null,
                status: 'IN_PROGRESS',
                sourceRoutineId: source?.id ?? null,
                memo: null,
                exercises:
                  source?.exercises.map((e) => ({
                    id: crypto.randomUUID(),
                    exerciseId: e.exerciseId,
                    sets: Array.from({ length: e.defaultSets }, () => ({
                      id: crypto.randomUUID(),
                      weight: '0',
                      reps: e.defaultReps,
                      rpe: null,
                      completed: false,
                    })),
                  })) ?? [],
              };
              await api<WorkoutRecord>(`/workouts/${id}`, {
                method: 'PUT',
                json: payload,
              });
              recordsChanged();
              router.push(`/workout/${id}`);
            } catch (error) {
              setError(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <label htmlFor="workout-date" className="mb-2 block">
              운동일
            </label>
            <DatePicker
              id="workout-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="routine" className="mb-2 block">
              시작할 루틴
            </label>
            <select
              id="routine"
              className="h-11 w-full rounded-md border bg-surface px-3"
              value={routine}
              onChange={(e) => setRoutine(e.target.value)}
            >
              <option value="">빈 운동으로 시작</option>
              {routines?.map((r) => (
                <option
                  key={r.id}
                  value={r.id}
                  disabled={r.exercises.some((e) => e.exercise.archivedAt)}
                >
                  {r.name}
                  {r.exercises.some((e) => e.exercise.archivedAt)
                    ? ' (보관된 종목 교체 필요)'
                    : ''}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <Button disabled={busy} type="submit">
            {busy ? '시작 중…' : '운동 시작'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
