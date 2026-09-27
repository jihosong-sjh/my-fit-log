export type ServingUnit = 'G' | 'ML' | 'PIECE' | 'PACK' | 'SERVING';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
export const MEAL_LABELS: Record<MealType, string> = {
  BREAKFAST: '아침',
  LUNCH: '점심',
  DINNER: '저녁',
  SNACK: '간식',
};
export const UNIT_LABELS: Record<ServingUnit, string> = {
  G: 'g',
  ML: 'ml',
  PIECE: '개',
  PACK: '팩',
  SERVING: '인분',
};
export type Nutrition = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};
export type FoodOption = Nutrition & {
  id: string;
  name: string;
  ownerId: string | null;
  servingSize: string;
  servingUnit: ServingUnit;
  archivedAt: string | null;
  favorite?: boolean;
  usageCount?: number;
  lastUsed?: string | null;
};
export type MealFoodRecord = {
  id: string;
  foodId: string;
  foodNameSnapshot: string;
  servingSizeSnapshot: string;
  servingUnitSnapshot: ServingUnit;
  caloriesSnapshot: string;
  proteinSnapshot: string;
  carbsSnapshot: string;
  fatSnapshot: string;
  servings: string;
  order: number;
};
export type MealRecord = {
  id: string;
  date: string;
  mealType: MealType;
  memo: string | null;
  foods: MealFoodRecord[];
  totals: Nutrition;
};
export type MealPresetRecord = {
  id: string;
  name: string;
  defaultMealType: MealType | null;
  foods: {
    id: string;
    foodId: string;
    servings: string;
    order: number;
    food: FoodOption;
  }[];
  totals: Nutrition;
};
