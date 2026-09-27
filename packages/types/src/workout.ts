export type ExerciseOption = {
  id: string;
  name: string;
  ownerId: string | null;
  catalogKey: string | null;
  trackingType: 'STRENGTH' | 'CARDIO';
  cardioInputMode: 'DISTANCE' | 'REPETITIONS' | 'DURATION' | null;
  archivedAt: string | null;
  favorite: boolean;
  recentAt?: string | null;
};
export type WorkoutSetInput = {
  id: string;
  weight: string;
  reps: number | null;
  rpe: string | null;
  completed: boolean;
};
export type WorkoutExerciseInput = {
  id: string;
  exerciseId: string;
  sets: WorkoutSetInput[];
};
export type WorkoutPayload = {
  baseRevision: number | null;
  mutationId: string;
  date: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  endedAt: string | null;
  sourceRoutineId: string | null;
  memo: string | null;
  exercises: WorkoutExerciseInput[];
};
export type WorkoutRecord = {
  id: string;
  revision: number;
  date: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  sourceRoutineId: string | null;
  memo: string | null;
  totalSets: number;
  volume: string;
  exercises: (WorkoutExerciseInput & {
    exerciseNameSnapshot: string;
    order: number;
  })[];
};
export type RoutineRecord = {
  id: string;
  name: string;
  description: string | null;
  exercises: {
    id: string;
    exerciseId: string;
    order: number;
    defaultSets: number;
    defaultReps: number | null;
    exercise: ExerciseOption;
  }[];
};
export type CardioRecord = {
  id: string;
  date: string;
  exerciseId: string;
  exerciseNameSnapshot: string;
  durationSeconds: number;
  distanceKm: string | null;
  repetitions: number | null;
  calories: string | null;
  averageHeartRate: number | null;
  memo: string | null;
  paceSecondsPerKm: string | null;
  exercise: { cardioInputMode: ExerciseOption['cardioInputMode'] };
};
