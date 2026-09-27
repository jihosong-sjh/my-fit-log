import type { BodyRecord } from './body';
import type { Nutrition } from './meal';
import type { WorkoutRecord } from './workout';
export type ActivityStats = {
  workoutCount: number;
  cardioCount: number;
  workoutDays: number;
  durationSeconds: number;
  totalSets: number;
  volume: string;
};
export type NutritionStats = {
  recordedDays: number;
  averageCalories: string | null;
  averageProtein: string | null;
  averageCarbs: string | null;
  averageFat: string | null;
};
export type GoalValues = {
  targetWeight: string | null;
  dailyCalories: string | null;
  proteinGoal: string | null;
  carbGoal: string | null;
  fatGoal: string | null;
  weeklyWorkoutGoal: number | null;
};
export type WeightPoint = {
  date: string;
  weight: string | null;
  average: string | null;
};
export type DashboardData = {
  date: string;
  today: ActivityStats;
  goals: GoalValues;
  nutrition: {
    recorded: boolean;
    totals: Nutrition;
    progress: Record<keyof Nutrition, string | null>;
  };
  body: {
    current: BodyRecord | null;
    trend: WeightPoint[];
    average: string | null;
    previousPeriodChange: string | null;
  };
  weekly: ActivityStats &
    NutritionStats & {
      from: string;
      to: string;
      weightChange: string | null;
      goalPercentage: string | null;
    };
  recentWorkout: WorkoutRecord[];
};
