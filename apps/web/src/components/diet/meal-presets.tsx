'use client';
import { GuardedDialogContent } from '@/components/guarded-dialog';
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
  type MealPresetRecord,
  type MealType,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { Input } from '@myfit/ui/input';
import { NumberInput, DatePicker } from '@myfit/ui/fields';
import { Card, CardContent } from '@myfit/ui/card';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@myfit/ui/dialog';
import { EmptyState } from '@myfit/ui/summary';
import { FoodPicker } from './food-picker';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { LoadingState, ErrorState } from '../resource-state';
function PresetEditor({
  initial,
  onSaved,
}: {
  initial: MealPresetRecord | null;
  onSaved: () => void;
}) {
  const guard = useFormGuard();
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState(initial?.defaultMealType ?? '');
  const [foods, setFoods] = useState<
    { key: string; food: FoodOption; servings: string }[]
  >(
    initial?.foods.map((f) => ({
      key: f.id,
      food: f.food,
      servings: f.servings,
    })) ?? [],
  );
  const changeFoods = (next: typeof foods) => {
    guard.markDirty();
    setFoods(next);
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const totals = nutritionTotal(
    foods.map((f) => ({
      caloriesSnapshot: f.food.calories,
      proteinSnapshot: f.food.protein,
      carbsSnapshot: f.food.carbs,
      fatSnapshot: f.food.fat,
      servings: f.servings || '0',
    })),
  );
  return (
    <form
      {...guard.props}
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await api(initial ? `/meal-presets/${initial.id}` : '/meal-presets', {
            method: initial ? 'PUT' : 'POST',
            json: {
              name,
              defaultMealType: type || null,
              foods: foods.map((f) => ({
                foodId: f.food.id,
                servings: f.servings,
              })),
            },
          });
          guard.markSaved();
          recordsChanged();
          toast.success('프리셋을 저장했어요');
          onSaved();
        } catch (e) {
          setError(errorMessage(e));
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label htmlFor="preset-name" className="mb-2 block">
          프리셋 이름
        </label>
        <Input
          id="preset-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
      </div>
      <div>
        <label htmlFor="preset-type" className="mb-2 block">
          기본 식사 구분
        </label>
        <select
          id="preset-type"
          className="h-11 w-full rounded-md border bg-surface px-3"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="">사용할 때 선택</option>
          {Object.entries(MEAL_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {foods.map((item, index) => (
        <div className="space-y-3 rounded-lg border p-3" key={item.key}>
          <h3>{item.food.name}</h3>
          <p className="caption">
            1회 {item.food.servingSize}
            {UNIT_LABELS[item.food.servingUnit]} · {item.food.calories} kcal
            {item.food.archivedAt ? ' · 보관됨: 교체가 필요해요' : ''}
          </p>
          <label htmlFor={`preset-serving-${index}`} className="block">
            제공량 배수 (회)
          </label>
          <NumberInput
            id={`preset-serving-${index}`}
            value={item.servings}
            onChange={(e) =>
              changeFoods(
                foods.map((f) =>
                  f.key === item.key ? { ...f, servings: e.target.value } : f,
                ),
              )
            }
            min="0.001"
            step="0.001"
            required
          />
          <div className="flex flex-wrap gap-2">
            <FoodPicker
              label="음식 교체"
              onSelect={(food) =>
                changeFoods(
                  foods.map((f) => (f.key === item.key ? { ...f, food } : f)),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                changeFoods(foods.filter((f) => f.key !== item.key))
              }
            >
              제거
            </Button>
          </div>
        </div>
      ))}
      <FoodPicker
        onSelect={(food) =>
          changeFoods([
            ...foods,
            { key: crypto.randomUUID(), food, servings: '1' },
          ])
        }
      />
      <p className="text-sm tabular-nums">
        현재 합계: {totals.calories} kcal · 단백질 {totals.protein}g
      </p>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={busy || !foods.length}>
          프리셋 저장
        </Button>
      </div>
    </form>
  );
}
export function MealPresets() {
  const router = useRouter();
  const { data, error, loading, reload } =
    useResource<MealPresetRecord[]>('/meal-presets');
  const [editing, setEditing] = useState<MealPresetRecord | null | undefined>();
  const [applying, setApplying] = useState<MealPresetRecord>();
  const [date, setDate] = useState(() => localDate(new Date()));
  const [type, setType] = useState<MealType>('BREAKFAST');
  const [busy, setBusy] = useState(false);
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <div className="mb-7 flex flex-wrap justify-between gap-4">
        <h1>식단 프리셋</h1>
        <Button onClick={() => setEditing(null)}>프리셋 만들기</Button>
      </div>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {loading && !data ? (
        <LoadingState />
      ) : data?.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((p) => (
            <Card key={p.id} className="shadow-none">
              <CardContent>
                <h2>{p.name}</h2>
                <p className="mt-2 caption">
                  {p.defaultMealType
                    ? MEAL_LABELS[p.defaultMealType]
                    : '식사 구분 미설정'}
                </p>
                <ul className="my-4 space-y-2">
                  {p.foods.map((f) => (
                    <li key={f.id}>
                      {f.food.name} ·{' '}
                      {new Decimal(f.food.servingSize)
                        .mul(f.servings)
                        .toFixed()}
                      {UNIT_LABELS[f.food.servingUnit]}
                      {f.food.archivedAt && (
                        <span className="ml-2 text-danger">보관됨</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mb-4 tabular-nums">
                  {p.totals.calories} kcal · 단백질 {p.totals.protein}g
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={busy || p.foods.some((f) => f.food.archivedAt)}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const latest = (
                          await api<MealPresetRecord[]>('/meal-presets')
                        ).find((row) => row.id === p.id);
                        if (latest) {
                          setApplying(latest);
                          setType(latest.defaultMealType ?? 'BREAKFAST');
                        }
                      } catch (e) {
                        toast.error(errorMessage(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    프리셋 적용
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(p)}>
                    프리셋 편집
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (
                        !confirm('프리셋을 삭제할까요? 과거 식사는 유지됩니다.')
                      )
                        return;
                      try {
                        await api(`/meal-presets/${p.id}`, {
                          method: 'DELETE',
                        });
                        recordsChanged();
                      } catch (e) {
                        toast.error(errorMessage(e));
                      }
                    }}
                  >
                    프리셋 삭제
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-none">
          <EmptyState
            title="자주 먹는 식단을 저장해보세요"
            description="여러 음식을 프리셋으로 묶으면 다음 식사를 빠르게 추가할 수 있어요."
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
            <DialogTitle>
              {editing ? '프리셋 편집' : '프리셋 만들기'}
            </DialogTitle>
            <DialogDescription>
              프리셋 사용 시 최신 음식 정보로 새 식사를 만듭니다.
            </DialogDescription>
          </DialogHeader>
          {editing !== undefined && (
            <PresetEditor
              key={editing?.id ?? 'new'}
              initial={editing}
              onSaved={() => setEditing(undefined)}
            />
          )}
        </GuardedDialogContent>
      </Dialog>
      <Dialog
        open={!!applying}
        onOpenChange={(open) => {
          if (!open) setApplying(undefined);
        }}
      >
        <GuardedDialogContent>
          <DialogHeader>
            <DialogTitle>식사에 프리셋 추가</DialogTitle>
            <DialogDescription>
              최신 제공량과 영양정보를 확인해주세요.
            </DialogDescription>
          </DialogHeader>
          {applying && (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                let navigated = false;
                try {
                  await api(`/meal-presets/${applying.id}/apply`, {
                    method: 'POST',
                    json: { date, mealType: type },
                  });
                  recordsChanged();
                  toast.success('프리셋을 식사에 추가했어요');
                  setApplying(undefined);
                  router.push(`/diet?date=${date}`);
                  navigated = true;
                } catch (error) {
                  toast.error(errorMessage(error));
                } finally {
                  if (!navigated) setBusy(false);
                }
              }}
            >
              <h3>{applying.name}</h3>
              <p>
                {applying.totals.calories} kcal · 단백질{' '}
                {applying.totals.protein}g
              </p>
              <ul className="text-sm text-muted-foreground">
                {applying.foods.map((f) => (
                  <li key={f.id}>
                    {f.food.name}{' '}
                    {new Decimal(f.food.servingSize).mul(f.servings).toFixed()}
                    {UNIT_LABELS[f.food.servingUnit]}
                  </li>
                ))}
              </ul>
              <div>
                <label htmlFor="apply-date" className="mb-2 block">
                  기록일
                </label>
                <DatePicker
                  id="apply-date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="apply-type" className="mb-2 block">
                  식사 구분
                </label>
                <select
                  id="apply-type"
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
              <Button
                type="submit"
                disabled={busy || applying.foods.some((f) => f.food.archivedAt)}
              >
                식사에 추가
              </Button>
            </form>
          )}
        </GuardedDialogContent>
      </Dialog>
    </main>
  );
}
