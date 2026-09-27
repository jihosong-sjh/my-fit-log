import { MealEditor } from '@/components/diet/meal-editor';
import { MEAL_LABELS, type MealType } from '@myfit/types';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; mealType?: string }>;
}) {
  const { date, mealType } = await searchParams;
  return (
    <MealEditor
      date={date}
      mealType={
        mealType && mealType in MEAL_LABELS ? (mealType as MealType) : undefined
      }
    />
  );
}
