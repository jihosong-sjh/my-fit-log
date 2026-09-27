'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useUser } from '../auth-context';
import { DraftController } from '@/lib/draft/engine';
import { makeDraft, type WorkoutDraft } from '@/lib/draft/model';
import {
  draftStorage,
  readDraft,
  consumeFreshDraft,
} from '@/lib/draft/storage';
import { sendDraft } from '@/lib/draft/client';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Copy, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import type {
  ExerciseOption,
  WorkoutRecord,
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
function Editor({ initial }: { initial: WorkoutDraft }) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const [store] = useState(
    () => new DraftController(initial, draftStorage, sendDraft, recordsChanged),
  );
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  const draft = state.doc.payload;
  const busy = state.saving;
  const error = state.error;
  const conflict = state.doc.syncState === 'CONFLICT';
  const [deleting, setDeleting] = useState(false);
  const [serverVersion, setServerVersion] = useState<WorkoutRecord>();
  useEffect(() => {
    const timer = setTimeout(() => {
      void store.start();
    }, 0);
    const online = () => {
      if (store.getSnapshot().doc.syncState !== 'CONFLICT') void store.retry();
    };
    const unload = (event: BeforeUnloadEvent) => {
      const value = store.getSnapshot();
      if (
        store.isActive() &&
        (value.doc.syncState !== 'SYNCED' || value.storageError)
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('online', online);
    window.addEventListener('beforeunload', unload);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', online);
      window.removeEventListener('beforeunload', unload);
      void store.stop();
    };
  }, [store]);
  const change = (next: WorkoutRecord) => store.update(next);
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
    if (!form.current?.reportValidity()) return;
    if (next !== draft) store.update(next);
    const saved = await store.sync();
    if (saved)
      toast.success(
        store.getSnapshot().doc.payload.status === 'COMPLETED'
          ? '운동을 완료했어요'
          : '운동을 저장했어요',
      );
    else
      toast.error(
        store.getSnapshot().storageError ||
          store.getSnapshot().error ||
          '저장하지 못했어요. 입력은 화면에 남아 있습니다.',
      );
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
  if (!state.ready) return <LoadingState />;
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
      <fieldset disabled={deleting} className="min-w-0 space-y-6">
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
            {draft.status === 'COMPLETED'
              ? state.doc.syncState === 'SYNCED'
                ? '완료한 운동'
                : '완료 저장 대기'
              : '작성 중'}
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
      {state.storageError && (
        <div className="rounded-xl border border-danger/30 p-4">
          <p role="alert" className="text-danger">
            {state.storageError}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void store.retry()}
          >
            기기 저장 다시 시도
          </Button>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-danger/30 p-4">
          <p role="alert" className="text-danger">
            {error}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!conflict && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void store.retry()}
              >
                다시 저장
              </Button>
            )}
            {state.httpStatus === 401 && (
              <Button asChild variant="outline">
                <Link href="/login">다시 로그인</Link>
              </Button>
            )}
            {conflict && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    setServerVersion(
                      await api<WorkoutRecord>(`/workouts/${draft.id}`),
                    );
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                }}
              >
                서버 기록 비교
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={async () => {
                if (
                  confirm('기기 입력을 폐기할까요? 서버 기록은 유지됩니다.')
                ) {
                  try {
                    await store.discard();
                    router.push('/workout');
                  } catch {
                    toast.error('기기 기록을 지우지 못했어요.');
                  }
                }
              }}
            >
              기기 입력만 폐기
            </Button>
          </div>
        </div>
      )}
      {serverVersion && (
        <Card className="border-warning/50 shadow-none">
          <CardContent>
            <h2 className="text-lg">서버 기록과 기기 입력 확인</h2>
            <p className="mt-3">
              서버: {serverVersion.date} ·{' '}
              {serverVersion.exercises
                .map(
                  (e) =>
                    `${e.exerciseNameSnapshot}: ${e.sets.map((s) => `${s.weight}kg × ${s.reps ?? '—'}`).join(', ')}`,
                )
                .join(' / ') || '종목 없음'}
            </p>
            <p className="mt-2 text-sm">
              서버 메모: {serverVersion.memo ?? '없음'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              기기 입력은 위 편집 화면에 그대로 남아 있습니다. 자동으로 합치거나
              덮어쓰지 않습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  if (confirm('기기 입력을 버리고 서버 기록을 사용할까요?')) {
                    await store.resolve(serverVersion, false);
                    setServerVersion(undefined);
                  }
                }}
              >
                서버 기록 사용
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (
                    confirm(
                      '확인한 서버 기록을 현재 기기 입력으로 덮어써서 저장할까요?',
                    )
                  ) {
                    await store.resolve(serverVersion, true);
                    setServerVersion(undefined);
                  }
                }}
              >
                기기 입력으로 다시 저장
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setServerVersion(undefined)}
              >
                기기 입력 계속 확인
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center gap-2 rounded-xl border bg-surface p-3 shadow-sm md:bottom-4">
        <span
          className="mr-auto text-sm text-muted-foreground"
          role="status"
          data-testid="draft-status"
        >
          {state.storageError
            ? '기기 저장 실패'
            : state.doc.syncState !== 'SYNCED' &&
                state.persistedVersion !== state.doc.localVersion
              ? '기기에 저장 중…'
              : busy
                ? '서버 저장 중…'
                : state.doc.syncState === 'SYNCED'
                  ? '저장됨'
                  : state.doc.syncState === 'CONFLICT'
                    ? '충돌 · 기기 입력 보존됨'
                    : state.doc.syncState === 'FAILED'
                      ? '저장 실패 · 기기 입력 보존됨'
                      : '기기에 저장 · 서버 저장 대기'}
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
          setDeleting(true);
          try {
            await store.stop();
            let revision = store.getSnapshot().doc.baseRevision;
            if (revision === null) {
              try {
                const remote = await api<
                  WorkoutRecord & { lastMutationId: string }
                >(`/workouts/${draft.id}`);
                if (
                  remote.lastMutationId !==
                  store.getSnapshot().doc.pendingMutationId
                )
                  throw new ApiClientError(409, 'CONFLICT', 'Record changed');
                revision = remote.revision;
              } catch (e) {
                if (!(e instanceof ApiClientError && e.status === 404)) throw e;
              }
            }
            if (revision !== null)
              await api(`/workouts/${draft.id}`, {
                method: 'DELETE',
                json: { baseRevision: revision },
              });
            await store.discard();
            recordsChanged();
            router.push('/workout/history');
          } catch (e) {
            toast.error(errorMessage(e));
            void store.start();
          } finally {
            setDeleting(false);
          }
        }}
      >
        운동 삭제
      </Button>
    </form>
  );
}
export function WorkoutEditor({ id }: { id: string }) {
  const user = useUser()!;
  const server = useResource<WorkoutRecord>(`/workouts/${id}`);
  const [local, setLocal] = useState<WorkoutDraft | null>();
  const [chosen, setChosen] = useState<WorkoutDraft>();
  const [readError, setReadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let active = true;
    void readDraft(user.id, id).then(
      (value) => {
        if (!active) return;
        setLocal(value);
        setReadError('');
        if (value && consumeFreshDraft(id)) setChosen(value);
      },
      (error) => {
        if (active)
          setReadError(
            error instanceof Error
              ? error.message
              : '기기 기록을 읽지 못했어요.',
          );
      },
    );
    return () => {
      active = false;
    };
  }, [user.id, id, reloadKey]);
  const discard = async () => {
    if (!confirm('기기의 임시 입력을 폐기할까요? 서버 기록은 유지됩니다.'))
      return;
    try {
      await draftStorage.remove(user.id, id);
      routerToList();
    } catch {
      setReadError('기기 기록을 지우지 못했어요. 다시 시도해주세요.');
    }
  };
  const router = useRouter();
  const routerToList = () => router.push('/workout');
  return (
    <main id="main-content" className="page-content">
      <h1 className="mb-7">운동 기록</h1>
      {readError ? (
        <Card>
          <CardContent>
            <p role="alert" className="text-danger">
              {readError}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setReloadKey(reloadKey + 1)}>
                기기 기록 다시 읽기
              </Button>
              <Button variant="outline" onClick={() => void discard()}>
                기기 기록 폐기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : chosen ? (
        <Editor initial={chosen} key={id} />
      ) : local ? (
        <Card className="border-brand/30">
          <CardContent>
            <h2>작성 중인 운동 기록이 있습니다</h2>
            <p className="mt-3">
              {local.payload.date} ·{' '}
              {local.payload.exercises
                .map((e) => e.exerciseNameSnapshot)
                .join(', ') || '새 운동'}
            </p>
            <p className="mt-2 text-muted-foreground">
              기기에 남아 있는 입력을 복구하시겠습니까? 서버에 저장되지 않은
              입력도 유지되어 있습니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  setChosen(
                    server.status === 404 && local.baseRevision !== null
                      ? { ...local, syncState: 'CONFLICT' }
                      : local,
                  )
                }
              >
                기록 복구
              </Button>
              <Button variant="outline" onClick={() => void discard()}>
                기기 기록 폐기
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : local === undefined || server.loading ? (
        <LoadingState />
      ) : server.data ? (
        <Editor initial={makeDraft(user.id, server.data)} key={id} />
      ) : (
        <ErrorState
          message={server.error || '운동 기록을 찾지 못했어요.'}
          retry={server.reload}
        />
      )}
    </main>
  );
}
