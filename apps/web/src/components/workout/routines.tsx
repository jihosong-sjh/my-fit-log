'use client';
import { GuardedDialogContent } from '@/components/guarded-dialog';
import { useFormGuard } from '@/lib/form-guard';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowUp, ArrowDown, Trash2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import type { RoutineRecord } from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { Input } from '@myfit/ui/input';
import { NumberInput } from '@myfit/ui/fields';
import { Card, CardContent } from '@myfit/ui/card';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@myfit/ui/dialog';
import { EmptyState } from '@myfit/ui/summary';
import { ExercisePicker } from './exercise-picker';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { ErrorState, LoadingState } from '../resource-state';
function RoutineEditor({
  initial,
  onSaved,
}: {
  initial: RoutineRecord | null;
  onSaved: () => void;
}) {
  const guard = useFormGuard();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [exercises, setExercises] = useState(
    initial?.exercises.map((e) => ({
      key: e.id,
      exerciseId: e.exerciseId,
      name: e.exercise.name,
      defaultSets: String(e.defaultSets),
      defaultReps: e.defaultReps?.toString() ?? '',
    })) ?? [],
  );
  const changeExercises = (next: typeof exercises) => {
    guard.markDirty();
    setExercises(next);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      {...guard.props}
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await api(initial ? `/routines/${initial.id}` : '/routines', {
            method: initial ? 'PUT' : 'POST',
            json: {
              name,
              description: description || null,
              exercises: exercises.map((e) => ({
                exerciseId: e.exerciseId,
                defaultSets: Number(e.defaultSets),
                defaultReps: e.defaultReps ? Number(e.defaultReps) : null,
              })),
            },
          });
          guard.markSaved();
          recordsChanged();
          toast.success('루틴을 저장했어요');
          onSaved();
        } catch (error) {
          setError(errorMessage(error));
          toast.error(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label htmlFor="routine-name" className="mb-2 block">
          루틴 이름
        </label>
        <Input
          id="routine-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
      </div>
      <div>
        <label htmlFor="routine-description" className="mb-2 block">
          설명
        </label>
        <Input
          id="routine-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
        />
      </div>
      {exercises.map((exercise, index) => (
        <div className="rounded-lg border p-3" key={exercise.key}>
          <div className="flex flex-wrap items-center justify-between">
            <h3>{exercise.name}</h3>
            <div className="flex">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`${exercise.name} 위로`}
                disabled={index === 0}
                onClick={() => {
                  const rows = [...exercises];
                  [rows[index - 1], rows[index]] = [
                    rows[index]!,
                    rows[index - 1]!,
                  ];
                  changeExercises(rows);
                }}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`${exercise.name} 아래로`}
                disabled={index === exercises.length - 1}
                onClick={() => {
                  const rows = [...exercises];
                  [rows[index + 1], rows[index]] = [
                    rows[index]!,
                    rows[index + 1]!,
                  ];
                  changeExercises(rows);
                }}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`${exercise.name} 제거`}
                onClick={() =>
                  changeExercises(
                    exercises.filter((e) => e.key !== exercise.key),
                  )
                }
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor={`${exercise.key}-sets`}
                className="mb-1 block text-sm"
              >
                기본 세트
              </label>
              <NumberInput
                id={`${exercise.key}-sets`}
                min="1"
                max="100"
                step="1"
                inputMode="numeric"
                required
                value={exercise.defaultSets}
                onChange={(e) =>
                  changeExercises(
                    exercises.map((row) =>
                      row.key === exercise.key
                        ? { ...row, defaultSets: e.target.value }
                        : row,
                    ),
                  )
                }
              />
            </div>
            <div>
              <label
                htmlFor={`${exercise.key}-reps`}
                className="mb-1 block text-sm"
              >
                기본 횟수
              </label>
              <NumberInput
                id={`${exercise.key}-reps`}
                min="1"
                step="1"
                inputMode="numeric"
                value={exercise.defaultReps}
                onChange={(e) =>
                  changeExercises(
                    exercises.map((row) =>
                      row.key === exercise.key
                        ? { ...row, defaultReps: e.target.value }
                        : row,
                    ),
                  )
                }
              />
            </div>
          </div>
        </div>
      ))}
      <ExercisePicker
        onSelect={(exercise) =>
          changeExercises([
            ...exercises,
            {
              key: crypto.randomUUID(),
              exerciseId: exercise.id,
              name: exercise.name,
              defaultSets: '3',
              defaultReps: '8',
            },
          ])
        }
      />
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy}>
          {busy ? '저장 중…' : '루틴 저장'}
        </Button>
      </div>
    </form>
  );
}
export function Routines() {
  const { data, error, loading, reload } =
    useResource<RoutineRecord[]>('/routines');
  const [editing, setEditing] = useState<RoutineRecord | null | undefined>(
    undefined,
  );
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <div className="mb-7 flex items-center justify-between">
        <h1>운동 루틴</h1>
        <Button onClick={() => setEditing(null)}>루틴 만들기</Button>
      </div>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {loading && !data ? (
        <LoadingState />
      ) : data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((r) => (
            <Card className="shadow-none" key={r.id}>
              <CardContent>
                <h2>{r.name}</h2>
                <p className="mt-2 text-muted-foreground">{r.description}</p>
                <ul className="my-4 space-y-1">
                  {r.exercises.map((e) => (
                    <li key={e.id}>
                      {e.exercise.name} · {e.defaultSets}세트
                      {e.exercise.archivedAt && (
                        <span className="ml-2 text-danger">
                          보관된 종목 교체 필요
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  {r.exercises.some((e) => e.exercise.archivedAt) ? (
                    <Button disabled>보관된 종목을 교체해주세요</Button>
                  ) : (
                    <Button asChild>
                      <Link href={`/workout/new?routine=${r.id}`}>
                        루틴으로 운동 시작
                      </Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setEditing(r)}>
                    루틴 편집
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (
                        !confirm(
                          '루틴을 삭제할까요? 기존 운동 기록은 유지됩니다.',
                        )
                      )
                        return;
                      try {
                        await api(`/routines/${r.id}`, { method: 'DELETE' });
                        recordsChanged();
                      } catch (e) {
                        toast.error(errorMessage(e));
                      }
                    }}
                  >
                    루틴 삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<ListChecks />}
            title="나만의 루틴을 만들어보세요"
            description="자주 하는 운동을 저장하면 다음 운동을 빠르게 시작할 수 있어요."
          />
        </Card>
      )}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <GuardedDialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? '루틴 편집' : '루틴 만들기'}</DialogTitle>
            <DialogDescription>
              루틴 변경은 기존 운동 기록에 영향을 주지 않습니다.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <RoutineEditor
              key={editing?.id ?? 'new'}
              initial={editing}
              onSaved={() => setEditing(undefined)}
            />
          )}
        </GuardedDialogContent>
      </Dialog>
    </main>
  );
}
