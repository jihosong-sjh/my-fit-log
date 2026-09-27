'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type {
  ExerciseOption,
  WorkoutRecord,
  WorkoutPayload,
  WorkoutSetInput,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { NumberInput, DatePicker } from '@myfit/ui/fields';
import { Card, CardContent } from '@myfit/ui/card';
import { ExercisePicker } from './exercise-picker';
import { api, ApiClientError, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { LoadingState, ErrorState } from '../resource-state';
function PreviousRecord({ exerciseId }: { exerciseId: string }) {
  const { data } = useResource<{ sets: WorkoutSetInput[] } | null>(
    `/exercises/${exerciseId}/previous`,
  );
  return (
    <p className="mt-2 caption">
      지난 기록:{' '}
      {data?.sets.length
        ? data.sets.map((s) => `${s.weight} kg × ${s.reps}`).join(' / ')
        : '완료한 기록이 아직 없어요'}
    </p>
  );
}
export function workoutPayload(record: WorkoutRecord): WorkoutPayload {
  return {
    baseRevision: record.revision,
    mutationId: crypto.randomUUID(),
    date: record.date,
    status: record.status,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    sourceRoutineId: record.sourceRoutineId,
    memo: record.memo,
    exercises: record.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      sets: e.sets.map((s) => ({
        id: s.id,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        completed: s.completed,
      })),
    })),
  };
}
function Editor({ initial }: { initial: WorkoutRecord }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const change = (next: WorkoutRecord) => {
    setDraft(next);
    setDirty(true);
  };
  const setValue = (
    exerciseId: string,
    setId: string,
    patch: Partial<WorkoutSetInput>,
  ) =>
    change({
      ...draft,
      exercises: draft.exercises.map((e) =>
        e.id === exerciseId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, ...patch } : s,
              ),
            }
          : e,
      ),
    });
  const save = async (next = draft) => {
    if (busy || !form.current?.reportValidity()) return;
    setBusy(true);
    setError('');
    setConflict(false);
    try {
      const saved = await api<WorkoutRecord>(`/workouts/${draft.id}`, {
        method: 'PUT',
        json: workoutPayload(next),
      });
      setDraft(saved);
      setDirty(false);
      recordsChanged();
      toast.success(
        next.status === 'COMPLETED' ? '운동을 완료했어요' : '운동을 저장했어요',
      );
    } catch (e) {
      setError(errorMessage(e));
      setConflict(e instanceof ApiClientError && e.status === 409);
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const addExercise = async (exercise: ExerciseOption) => {
    const previous = await api<{ sets: WorkoutSetInput[] } | null>(
      `/exercises/${exercise.id}/previous`,
    );
    const last = previous?.sets[0];
    change({
      ...draft,
      exercises: [
        ...draft.exercises,
        {
          id: crypto.randomUUID(),
          exerciseId: exercise.id,
          exerciseNameSnapshot: exercise.name,
          order: draft.exercises.length,
          sets: [
            {
              id: crypto.randomUUID(),
              weight: last?.weight ?? '0',
              reps: last?.reps ?? null,
              rpe: last?.rpe ?? null,
              completed: false,
            },
          ],
        },
      ],
    });
  };
  return (
    <form
      ref={form}
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          void save();
        }
      }}
    >
      <fieldset disabled={busy} className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="record-date" className="mb-2 block text-sm">
              운동일
            </label>
            <DatePicker
              id="record-date"
              value={draft.date}
              onChange={(e) => change({ ...draft, date: e.target.value })}
              required
            />
          </div>
          <span className="rounded-full bg-secondary px-3 py-2 text-secondary-foreground">
            {draft.status === 'COMPLETED' ? '완료한 운동' : '작성 중'}
          </span>
          <span className="text-sm text-muted-foreground">
            {draft.totalSets}세트 · {draft.volume} kg
            {draft.durationSeconds !== null
              ? ` · ${Math.floor(draft.durationSeconds / 60)}분`
              : ''}
          </span>
        </div>
        {draft.exercises.map((exercise, exerciseIndex) => (
          <Card key={exercise.id} className="shadow-none">
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg">{exercise.exerciseNameSnapshot}</h2>
                  <PreviousRecord exerciseId={exercise.exerciseId} />
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={exerciseIndex === 0}
                    aria-label={`${exercise.exerciseNameSnapshot} 위로`}
                    onClick={() => {
                      const items = [...draft.exercises];
                      [items[exerciseIndex - 1], items[exerciseIndex]] = [
                        items[exerciseIndex]!,
                        items[exerciseIndex - 1]!,
                      ];
                      change({ ...draft, exercises: items });
                    }}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={exerciseIndex === draft.exercises.length - 1}
                    aria-label={`${exercise.exerciseNameSnapshot} 아래로`}
                    onClick={() => {
                      const items = [...draft.exercises];
                      [items[exerciseIndex + 1], items[exerciseIndex]] = [
                        items[exerciseIndex]!,
                        items[exerciseIndex + 1]!,
                      ];
                      change({ ...draft, exercises: items });
                    }}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${exercise.exerciseNameSnapshot} 제거`}
                    onClick={() =>
                      change({
                        ...draft,
                        exercises: draft.exercises.filter(
                          (e) => e.id !== exercise.id,
                        ),
                      })
                    }
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] gap-2 text-center caption">
                <span>세트</span>
                <span>kg</span>
                <span>횟수</span>
                <span>RPE</span>
                <span>완료</span>
              </div>
              <div className="divide-y">
                {exercise.sets.map((set, index) => (
                  <div
                    key={set.id}
                    className={`py-3 ${set.completed ? 'bg-success/5' : ''}`}
                  >
                    <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_40px] items-center gap-2">
                      <span className="text-center tabular-nums">
                        {index + 1}
                      </span>
                      <NumberInput
                        aria-label={`${exercise.exerciseNameSnapshot} ${index + 1}세트 중량`}
                        value={set.weight}
                        min="0"
                        max="99999.99"
                        required
                        onChange={(e) =>
                          setValue(exercise.id, set.id, {
                            weight: e.target.value,
                          })
                        }
                      />
                      <NumberInput
                        aria-label={`${exercise.exerciseNameSnapshot} ${index + 1}세트 횟수`}
                        value={set.reps ?? ''}
                        min="1"
                        step="1"
                        inputMode="numeric"
                        onChange={(e) =>
                          setValue(exercise.id, set.id, {
                            reps:
                              e.target.value === ''
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                      <NumberInput
                        aria-label={`${exercise.exerciseNameSnapshot} ${index + 1}세트 RPE`}
                        value={set.rpe ?? ''}
                        min="1"
                        max="10"
                        step="0.5"
                        onChange={(e) =>
                          setValue(exercise.id, set.id, {
                            rpe: e.target.value || null,
                          })
                        }
                      />
                      <label className="flex min-h-11 items-center justify-center">
                        <input
                          type="checkbox"
                          className="size-5 accent-[var(--success)]"
                          aria-label={`${exercise.exerciseNameSnapshot} ${index + 1}세트 완료`}
                          checked={set.completed}
                          onChange={(e) =>
                            setValue(exercise.id, set.id, {
                              completed: e.target.checked,
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`${exercise.exerciseNameSnapshot} ${index + 1}세트 복사`}
                        onClick={() =>
                          change({
                            ...draft,
                            exercises: draft.exercises.map((e) =>
                              e.id === exercise.id
                                ? {
                                    ...e,
                                    sets: [
                                      ...e.sets.slice(0, index + 1),
                                      {
                                        ...set,
                                        id: crypto.randomUUID(),
                                        completed: false,
                                      },
                                      ...e.sets.slice(index + 1),
                                    ],
                                  }
                                : e,
                            ),
                          })
                        }
                      >
                        <Copy aria-hidden="true" />
                        복사
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        aria-label={`${exercise.exerciseNameSnapshot} ${index + 1}세트 삭제`}
                        onClick={() =>
                          change({
                            ...draft,
                            exercises: draft.exercises.map((e) =>
                              e.id === exercise.id
                                ? {
                                    ...e,
                                    sets: e.sets.filter((s) => s.id !== set.id),
                                  }
                                : e,
                            ),
                          })
                        }
                      >
                        <Trash2 aria-hidden="true" />
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full"
                onClick={() => {
                  const last = exercise.sets.at(-1);
                  change({
                    ...draft,
                    exercises: draft.exercises.map((e) =>
                      e.id === exercise.id
                        ? {
                            ...e,
                            sets: [
                              ...e.sets,
                              {
                                id: crypto.randomUUID(),
                                weight: last?.weight ?? '0',
                                reps: last?.reps ?? null,
                                rpe: last?.rpe ?? null,
                                completed: false,
                              },
                            ],
                          }
                        : e,
                    ),
                  });
                }}
              >
                <Plus aria-hidden="true" />
                세트 추가
              </Button>
            </CardContent>
          </Card>
        ))}
        <ExercisePicker onSelect={addExercise} />
        <div>
          <label htmlFor="workout-memo" className="mb-2 block">
            운동 메모
          </label>
          <textarea
            id="workout-memo"
            className="min-h-24 w-full rounded-md border bg-surface p-3"
            value={draft.memo ?? ''}
            maxLength={2000}
            onChange={(e) => change({ ...draft, memo: e.target.value || null })}
          />
        </div>
      </fieldset>
      {error && (
        <div className="rounded-xl border border-danger/30 p-4">
          <p role="alert" className="text-danger">
            {error}
          </p>
          {conflict && (
            <Button
              type="button"
              variant="outline"
              className="mt-3"
              onClick={async () => {
                if (
                  confirm('입력 중인 내용을 버리고 서버 기록을 불러올까요?')
                ) {
                  setDraft(await api<WorkoutRecord>(`/workouts/${draft.id}`));
                  setDirty(false);
                  setError('');
                }
              }}
            >
              서버 기록 다시 불러오기
            </Button>
          )}
        </div>
      )}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3 shadow-sm md:bottom-4">
        <span className="mr-auto text-sm text-muted-foreground" role="status">
          {busy ? '저장 중…' : dirty ? '저장하지 않은 변경사항' : '저장됨'}
        </span>
        <Button type="submit" variant="outline" disabled={busy}>
          운동 저장
        </Button>
        {draft.status === 'IN_PROGRESS' && (
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void save({
                ...draft,
                status: 'COMPLETED',
                endedAt: new Date().toISOString(),
              })
            }
          >
            <Check aria-hidden="true" />
            운동 완료
          </Button>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        className="text-danger"
        disabled={busy}
        onClick={async () => {
          if (!confirm('이 운동과 모든 세트를 삭제할까요?')) return;
          try {
            await api(`/workouts/${draft.id}`, {
              method: 'DELETE',
              json: { baseRevision: draft.revision },
            });
            recordsChanged();
            router.push('/workout/history');
          } catch (e) {
            toast.error(errorMessage(e));
          }
        }}
      >
        운동 삭제
      </Button>
    </form>
  );
}
export function WorkoutEditor({ id }: { id: string }) {
  const { data, error, loading, reload } = useResource<WorkoutRecord>(
    `/workouts/${id}`,
  );
  return (
    <main id="main-content" className="page-content">
      <h1 className="mb-7">운동 기록</h1>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {!data && loading ? (
        <LoadingState />
      ) : (
        data && <Editor initial={data} key={data.id} />
      )}
    </main>
  );
}
