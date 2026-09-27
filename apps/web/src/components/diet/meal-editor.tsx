'use client';
import { useFormGuard } from '@/lib/form-guard';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Decimal,
  localDate,
  nutritionTotal,
  MEAL_LABELS,
  UNIT_LABELS,
  type FoodOption,
  type MealFoodRecord,
  type MealRecord,
  type MealType,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { NumberInput, DatePicker } from '@myfit/ui/fields';
import { Card, CardContent } from '@myfit/ui/card';
import { FoodPicker } from './food-picker';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { ErrorState, LoadingState } from '../resource-state';
export function mealFood(
  food: FoodOption,
  id: string = crypto.randomUUID(),
): MealFoodRecord {
  return {
    id,
    foodId: food.id,
    foodNameSnapshot: food.name,
    servingSizeSnapshot: food.servingSize,
    servingUnitSnapshot: food.servingUnit,
    caloriesSnapshot: food.calories,
    proteinSnapshot: food.protein,
    carbsSnapshot: food.carbs,
    fatSnapshot: food.fat,
    servings: '1',
    order: 0,
  };
}
function Editor({
  initial,
  initialDate,
  initialType,
}: {
  initial?: MealRecord;
  initialDate?: string;
  initialType?: MealType;
}) {
  const guard = useFormGuard();
  const router = useRouter();
  const [date, setDate] = useState(
    initial?.date ?? initialDate ?? localDate(new Date()),
  );
  const [type, setType] = useState<MealType>(
    initial?.mealType ?? initialType ?? 'BREAKFAST',
  );
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [foods, setFoods] = useState<MealFoodRecord[]>(initial?.foods ?? []);
  const changeFoods = (next: typeof foods) => {
    guard.markDirty();
    setFoods(next);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totals = nutritionTotal(
    foods.map((f) => ({ ...f, servings: f.servings || '0' })),
  );
  const removeMeal = async () => {
    if (!initial) return;
    await api(`/meals/${initial.id}`, { method: 'DELETE' });
    guard.markSaved();
    recordsChanged();
    router.push(`/diet?date=${date}`);
  };
  return (
    <form
      {...guard.props}
      className="mt-7 max-w-3xl space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!foods.length) {
          setError('음식을 한 개 이상 추가해주세요.');
          return;
        }
        setBusy(true);
        setError('');
        let navigated = false;
        try {
          await api<MealRecord>(initial ? `/meals/${initial.id}` : '/meals', {
            method: initial ? 'PUT' : 'POST',
            json: {
              date,
              mealType: type,
              memo: memo || null,
              foods: foods.map((f) => ({
                id: f.id,
                foodId: f.foodId,
                servings: f.servings,
              })),
            },
          });
          guard.markSaved();
          recordsChanged();
          toast.success('식단을 저장했어요');
          router.push(`/diet?date=${date}`);
          navigated = true;
        } catch (e) {
          setError(errorMessage(e));
          toast.error(errorMessage(e));
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="meal-date" className="mb-2 block">
              식사일
            </label>
            <DatePicker
              id="meal-date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="meal-type" className="mb-2 block">
              식사 구분
            </label>
            <select
              id="meal-type"
              className="h-11 w-full rounded-md border bg-surface px-3"
              value={type}
              onChange={(e) => setType(e.target.value as MealType)}
            >
              {Object.entries(MEAL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {foods.map((food, index) => (
          <Card className="shadow-none" key={food.id}>
            <CardContent>
              <h2 className="text-lg">{food.foodNameSnapshot}</h2>
              <p className="mt-2 caption">
                1회 = {food.servingSizeSnapshot}
                {UNIT_LABELS[food.servingUnitSnapshot]} ·{' '}
                {food.caloriesSnapshot} kcal
              </p>
              <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4">
                <div>
                  <label htmlFor={`servings-${food.id}`} className="mb-2 block">
                    섭취량 (회)
                  </label>
                  <NumberInput
                    id={`servings-${food.id}`}
                    min="0.001"
                    max="9999999.999"
                    step="0.001"
                    required
                    value={food.servings}
                    onChange={(e) =>
                      changeFoods(
                        foods.map((f) =>
                          f.id === food.id
                            ? { ...f, servings: e.target.value }
                            : f,
                        ),
                      )
                    }
                  />
                </div>
                <p className="pb-2 text-sm tabular-nums">
                  {new Decimal(food.servingSizeSnapshot)
                    .mul(food.servings || 0)
                    .toFixed()}{' '}
                  {UNIT_LABELS[food.servingUnitSnapshot]}
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <FoodPicker
                  label="음식 교체"
                  onSelect={(next) => {
                    if (next.id !== food.foodId)
                      changeFoods(
                        foods.map((f) =>
                          f.id === food.id
                            ? {
                                ...mealFood(next, food.id),
                                servings: food.servings,
                              }
                            : f,
                        ),
                      );
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    if (foods.length === 1 && initial) {
                      if (confirm('마지막 음식입니다. 식사를 삭제할까요?')) {
                        try {
                          await removeMeal();
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }
                      return;
                    }
                    changeFoods(foods.filter((f) => f.id !== food.id));
                  }}
                >
                  음식 제거
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={index === 0}
                  onClick={() => {
                    const list = [...foods];
                    [list[index - 1], list[index]] = [
                      list[index]!,
                      list[index - 1]!,
                    ];
                    changeFoods(list);
                  }}
                >
                  위로
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        <FoodPicker
          onSelect={(food) => changeFoods([...foods, mealFood(food)])}
        />
        <div>
          <label htmlFor="meal-memo" className="mb-2 block">
            식사 메모
          </label>
          <textarea
            id="meal-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={2000}
            className="min-h-24 w-full rounded-md border bg-surface p-3"
          />
        </div>
      </fieldset>
      <Card className="shadow-none">
        <CardContent>
          <h3>영양 합계</h3>
          <p className="mt-2 tabular-nums">
            {totals.calories} kcal · 단백질 {totals.protein}g · 탄수화물{' '}
            {totals.carbs}g · 지방 {totals.fat}g
          </p>
          <p className="mt-2 caption">
            저장한 식사는 당시 영양정보를 유지합니다.
          </p>
        </CardContent>
      </Card>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? '저장 중…' : '식단 저장'}
        </Button>
        {initial && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={async () => {
              if (confirm('식사 기록을 삭제할까요?')) {
                try {
                  await removeMeal();
                } catch (e) {
                  toast.error(errorMessage(e));
                }
              }
            }}
          >
            식사 삭제
          </Button>
        )}
      </div>
    </form>
  );
}
export function MealEditor({
  id,
  date,
  mealType,
}: {
  id?: string;
  date?: string;
  mealType?: MealType;
}) {
  const { data, error, loading, reload } = useResource<MealRecord>(
    id ? `/meals/${id}` : null,
  );
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <h1>{id ? '식단 수정' : '식단 기록'}</h1>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {id && !data && loading ? (
        <LoadingState />
      ) : (
        (!id || data) && (
          <Editor
            initial={data}
            initialDate={date}
            initialType={mealType}
            key={id ?? date ?? 'new'}
          />
        )
      )}
    </main>
  );
}
