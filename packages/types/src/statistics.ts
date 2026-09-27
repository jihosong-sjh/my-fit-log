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
export type AnalyticsData = {
  from: string;
  to: string;
  weight: {
    start: string | null;
    current: BodyRecord | null;
    difference: string | null;
    series: WeightPoint[];
  };
  workout: ActivityStats & {
    weekly: ({ date: string } & ActivityStats)[];
    exerciseTrends: {
      exerciseId: string;
      name: string;
      points: { date: string; weight: string | null }[];
    }[];
  };
  nutrition: NutritionStats & {
    goals: Record<keyof Nutrition, string | null>;
    goalAchievement: string | null;
    series: ({ date: string } & Record<keyof Nutrition, string | null>)[];
  };
  cardio: {
    exerciseId: string;
    name: string;
    mode: 'DISTANCE' | 'REPETITIONS' | 'DURATION';
    durationSeconds: number;
    distanceKm: string | null;
    repetitions: number | null;
    paceSecondsPerKm: string | null;
    points: {
      date: string;
      durationSeconds: number | null;
      distanceKm: string | null;
      repetitions: number | null;
    }[];
  }[];
};
export type CalendarMonth = {
  month: string;
  days: {
    date: string;
    workout: boolean;
    inProgress: boolean;
    meal: boolean;
    body: boolean;
  }[];
};
export type CalendarDay = {
  date: string;
  workouts: WorkoutRecord[];
  cardio: {
    id: string;
    exerciseNameSnapshot: string;
    durationSeconds: number;
    distanceKm: string | null;
    repetitions: number | null;
  }[];
  meals: import('./meal').MealRecord[];
  nutrition: { recorded: boolean; totals: Nutrition };
  body: BodyRecord | null;
};
