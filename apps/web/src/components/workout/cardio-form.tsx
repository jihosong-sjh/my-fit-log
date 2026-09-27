'use client';
import { useFormGuard } from '@/lib/form-guard';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Decimal,
  localDate,
  type CardioRecord,
  type ExerciseOption,
} from '@myfit/types';
import { NumberInput, DatePicker } from '@myfit/ui/fields';
import { Button } from '@myfit/ui/button';
import { Card, CardContent } from '@myfit/ui/card';
import { ExercisePicker } from './exercise-picker';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { ErrorState, LoadingState } from '../resource-state';
function Form({ initial }: { initial?: CardioRecord }) {
  const guard = useFormGuard();
  const router = useRouter();
  const [exercise, setExercise] = useState<{
    id: string;
    name: string;
    cardioInputMode: ExerciseOption['cardioInputMode'];
  } | null>(
    initial
      ? {
          id: initial.exerciseId,
          name: initial.exerciseNameSnapshot,
          cardioInputMode: initial.exercise.cardioInputMode,
        }
      : null,
  );
  const [date, setDate] = useState(initial?.date ?? localDate(new Date()));
  const [minutes, setMinutes] = useState(
    initial ? String(Math.floor(initial.durationSeconds / 60)) : '',
  );
  const [seconds, setSeconds] = useState(
    initial ? String(initial.durationSeconds % 60) : '0',
  );
  const [distance, setDistance] = useState(initial?.distanceKm ?? '');
  const [unit, setUnit] = useState('km');
  const [reps, setReps] = useState(initial?.repetitions?.toString() ?? '');
  const [calories, setCalories] = useState(initial?.calories ?? '');
  const [heart, setHeart] = useState(
    initial?.averageHeartRate?.toString() ?? '',
  );
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <Card className="mt-7 max-w-2xl shadow-none">
      <CardContent>
        <form
          {...guard.props}
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!exercise) {
              setError('유산소 종목을 선택해주세요.');
              return;
            }
            setBusy(true);
            setError('');
            let navigated = false;
            try {
              await api(initial ? `/cardio/${initial.id}` : '/cardio', {
                method: initial ? 'PUT' : 'POST',
                json: {
                  date,
                  exerciseId: exercise.id,
                  durationSeconds:
                    Number(minutes || 0) * 60 + Number(seconds || 0),
                  distanceKm:
                    exercise.cardioInputMode === 'DISTANCE' && distance
                      ? new Decimal(distance)
                          .div(unit === 'm' ? 1000 : 1)
                          .toFixed()
                      : null,
                  repetitions:
                    exercise.cardioInputMode === 'REPETITIONS' && reps
                      ? Number(reps)
                      : null,
                  calories: calories || null,
                  averageHeartRate: heart ? Number(heart) : null,
                  memo: memo || null,
                },
              });
              guard.markSaved();
              recordsChanged();
              toast.success('유산소 기록을 저장했어요');
              router.push('/workout/history');
              navigated = true;
            } catch (error) {
              setError(errorMessage(error));
              toast.error(errorMessage(error));
            } finally {
              if (!navigated) setBusy(false);
            }
          }}
          onKeyDown={(e) => {
            if (!e.currentTarget.contains(e.target as Node)) return;
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.requestSubmit();
            }
          }}
        >
          <fieldset disabled={busy} className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <ExercisePicker
                type="CARDIO"
                onSelect={(e) => {
                  guard.markDirty();
                  setExercise(e);
                  setDistance('');
                  setReps('');
                }}
              />
              <span className="font-medium">
                {exercise?.name ?? '종목을 선택해주세요'}
              </span>
            </div>
            <div>
              <label htmlFor="cardio-date" className="mb-2 block">
                유산소 운동일
              </label>
              <DatePicker
                id="cardio-date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cardio-minutes" className="mb-2 block">
                  운동 시간 (분)
                </label>
                <NumberInput
                  id="cardio-minutes"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  min="0"
                  max="35791394"
                  step="1"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label htmlFor="cardio-seconds" className="mb-2 block">
                  추가 시간 (초)
                </label>
                <NumberInput
                  id="cardio-seconds"
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                  min="0"
                  max="59"
                  step="1"
                  inputMode="numeric"
                />
              </div>
            </div>
            {exercise?.cardioInputMode === 'DISTANCE' && (
              <div>
                <label htmlFor="distance" className="mb-2 block">
                  거리 ({unit}, 선택)
                </label>
                <div className="flex gap-2">
                  <NumberInput
                    id="distance"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    min={unit === 'm' ? '1' : '0.001'}
                    step={unit === 'm' ? '1' : '0.001'}
                  />
                  <select
                    aria-label="거리 단위"
                    className="rounded-md border bg-surface px-3"
                    value={unit}
                    onChange={(e) => {
                      const next = e.target.value;
                      if (distance)
                        setDistance(
                          new Decimal(distance)
                            .mul(next === 'm' ? 1000 : 0.001)
                            .toFixed(),
                        );
                      setUnit(next);
                    }}
                  >
                    <option value="km">km</option>
                    <option value="m">m</option>
                  </select>
                </div>
              </div>
            )}
            {exercise?.cardioInputMode === 'REPETITIONS' && (
              <div>
                <label htmlFor="cardio-repetitions" className="mb-2 block">
                  횟수 (선택)
                </label>
                <NumberInput
                  id="cardio-repetitions"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  min="1"
                  step="1"
                  inputMode="numeric"
                />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cardio-calories" className="mb-2 block">
                  소모 열량 (kcal, 선택)
                </label>
                <NumberInput
                  id="cardio-calories"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="cardio-heart" className="mb-2 block">
                  평균 심박 (bpm, 선택)
                </label>
                <NumberInput
                  id="cardio-heart"
                  value={heart}
                  onChange={(e) => setHeart(e.target.value)}
                  min="1"
                  max="300"
                  step="1"
                  inputMode="numeric"
                />
              </div>
            </div>
            <div>
              <label htmlFor="cardio-memo" className="mb-2 block">
                메모
              </label>
              <textarea
                id="cardio-memo"
                className="min-h-24 w-full rounded-md border bg-surface p-3"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                maxLength={2000}
              />
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-danger">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? '저장 중…' : '유산소 저장'}
            </Button>
            {initial && (
              <Button
                variant="outline"
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!confirm('유산소 기록을 삭제할까요?')) return;
                  try {
                    await api(`/cardio/${initial.id}`, { method: 'DELETE' });
                    guard.markSaved();
                    recordsChanged();
                    router.push('/workout/history');
                  } catch (e) {
                    toast.error(errorMessage(e));
                  }
                }}
              >
                유산소 삭제
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
export function CardioForm({ id }: { id?: string }) {
  const { data, error, loading, reload } = useResource<CardioRecord>(
    id ? `/cardio/${id}` : null,
  );
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <h1>{id ? '유산소 기록 수정' : '유산소 기록'}</h1>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {id && !data && loading ? (
        <LoadingState />
      ) : (
        (!id || data) && <Form initial={data} key={id ?? 'new'} />
      )}
    </main>
  );
}
