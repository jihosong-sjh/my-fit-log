'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Utensils } from 'lucide-react';
import {
  localDate,
  sum,
  MEAL_LABELS,
  UNIT_LABELS,
  Decimal,
  type MealRecord,
  type MealType,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { DatePicker } from '@myfit/ui/fields';
import { Card, CardContent } from '@myfit/ui/card';
import { StatCard, EmptyState } from '@myfit/ui/summary';
import { useResource } from '@/lib/use-resource';
import { LoadingState, ErrorState } from '../resource-state';
export function DietPage({ initialDate }: { initialDate?: string }) {
  const [date, setDate] = useState(initialDate ?? localDate(new Date()));
  const { data, error, loading, reload } = useResource<MealRecord[]>(
    `/meals?date=${date}`,
  );
  const totals = {
    calories: sum(data?.map((m) => m.totals.calories) ?? []),
    protein: sum(data?.map((m) => m.totals.protein) ?? []),
    carbs: sum(data?.map((m) => m.totals.carbs) ?? []),
    fat: sum(data?.map((m) => m.totals.fat) ?? []),
  };
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1>식단</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/diet/presets">식단 프리셋</Link>
          </Button>
          <Button asChild>
            <Link href={`/diet/new?date=${date}`}>식단 추가</Link>
          </Button>
        </div>
      </div>
      <div className="mb-6 max-w-xs">
        <label htmlFor="diet-date" className="mb-2 block">
          기록일
        </label>
        <DatePicker
          id="diet-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {loading && !data ? (
        <LoadingState />
      ) : (
        <>
          <section
            aria-label="일일 영양 합계"
            className="grid grid-cols-2 gap-3 xl:grid-cols-4"
          >
            {(
              [
                ['calories', '열량', 'kcal'],
                ['protein', '단백질', 'g'],
                ['carbs', '탄수화물', 'g'],
                ['fat', '지방', 'g'],
              ] as const
            ).map(([key, label, unit]) => (
              <StatCard
                key={key}
                title={label}
                value={data?.length ? totals[key] : null}
                unit={unit}
                description={
                  data?.length ? '기록된 식사 합계' : '아직 기록이 없어요'
                }
              />
            ))}
          </section>
          <div className="mt-7 grid gap-5 xl:grid-cols-2">
            {Object.entries(MEAL_LABELS).map(([key, label]) => {
              const meals = data?.filter((m) => m.mealType === key) ?? [];
              return (
                <Card key={key} className="shadow-none">
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <h2>{label}</h2>
                      <Button variant="ghost" asChild>
                        <Link href={`/diet/new?date=${date}&mealType=${key}`}>
                          {label} 추가
                        </Link>
                      </Button>
                    </div>
                    {meals.length ? (
                      <ul className="mt-4 divide-y">
                        {meals.map((meal) => (
                          <li key={meal.id}>
                            <Link
                              href={`/diet/${meal.id}`}
                              className="block py-4"
                            >
                              <h3>
                                {meal.foods
                                  .map((f) => f.foodNameSnapshot)
                                  .join(', ')}
                              </h3>
                              <p className="mt-1 caption">
                                {meal.foods
                                  .map(
                                    (f) =>
                                      `${new Decimal(f.servingSizeSnapshot).mul(f.servings).toFixed()}${UNIT_LABELS[f.servingUnitSnapshot]}`,
                                  )
                                  .join(' + ')}
                              </p>
                              <p className="mt-2 font-medium tabular-nums">
                                {meal.totals.calories} kcal
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <EmptyState
                        icon={<Utensils className="size-5" />}
                        title={`${MEAL_LABELS[key as MealType]} 기록이 없어요`}
                        description="먹은 음식과 양을 추가해보세요."
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}
