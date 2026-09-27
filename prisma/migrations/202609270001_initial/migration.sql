-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TrackingType" AS ENUM ('STRENGTH', 'CARDIO');

-- CreateEnum
CREATE TYPE "CardioInputMode" AS ENUM ('DISTANCE', 'REPETITIONS', 'DURATION');

-- CreateEnum
CREATE TYPE "WorkoutStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ServingUnit" AS ENUM ('G', 'ML', 'PIECE', 'PACK', 'SERVING');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGoal" (
    "userId" UUID NOT NULL,
    "targetWeight" DECIMAL(7,2),
    "dailyCalories" DECIMAL(10,2),
    "proteinGoal" DECIMAL(10,2),
    "carbGoal" DECIMAL(10,2),
    "fatGoal" DECIMAL(10,2),
    "weeklyWorkoutGoal" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserGoal_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "userId" UUID NOT NULL,
    "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" UUID NOT NULL,
    "ownerId" UUID,
    "catalogKey" TEXT,
    "name" TEXT NOT NULL,
    "trackingType" "TrackingType" NOT NULL,
    "cardioInputMode" "CardioInputMode",
    "category" TEXT NOT NULL,
    "muscleGroup" TEXT NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExerciseFavorite" (
    "userId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseFavorite_pkey" PRIMARY KEY ("userId","exerciseId")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sourceRoutineId" UUID,
    "date" DATE NOT NULL,
    "status" "WorkoutStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "endedAt" TIMESTAMPTZ(3),
    "durationSeconds" INTEGER,
    "memo" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "lastMutationId" UUID NOT NULL,
    "lastMutationHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" UUID NOT NULL,
    "workoutSessionId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "exerciseNameSnapshot" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" UUID NOT NULL,
    "workoutExerciseId" UUID NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "weight" DECIMAL(7,2) NOT NULL DEFAULT 0,
    "reps" INTEGER,
    "rpe" DECIMAL(4,1),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutRoutine" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WorkoutRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "id" UUID NOT NULL,
    "routineId" UUID NOT NULL,
    "exerciseId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "defaultSets" INTEGER NOT NULL,
    "defaultReps" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "RoutineExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardioRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "exerciseId" UUID NOT NULL,
    "exerciseNameSnapshot" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "distanceKm" DECIMAL(8,3),
    "repetitions" INTEGER,
    "calories" DECIMAL(10,2),
    "averageHeartRate" INTEGER,
    "memo" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CardioRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" UUID NOT NULL,
    "ownerId" UUID,
    "catalogKey" TEXT,
    "name" TEXT NOT NULL,
    "servingSize" DECIMAL(10,3) NOT NULL,
    "servingUnit" "ServingUnit" NOT NULL,
    "calories" DECIMAL(10,2) NOT NULL,
    "protein" DECIMAL(10,2) NOT NULL,
    "carbs" DECIMAL(10,2) NOT NULL,
    "fat" DECIMAL(10,2) NOT NULL,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodFavorite" (
    "userId" UUID NOT NULL,
    "foodId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodFavorite_pkey" PRIMARY KEY ("userId","foodId")
);

-- CreateTable
CREATE TABLE "Meal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Meal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealFood" (
    "id" UUID NOT NULL,
    "mealId" UUID NOT NULL,
    "foodId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "foodNameSnapshot" TEXT NOT NULL,
    "servingSizeSnapshot" DECIMAL(10,3) NOT NULL,
    "servingUnitSnapshot" "ServingUnit" NOT NULL,
    "caloriesSnapshot" DECIMAL(10,2) NOT NULL,
    "proteinSnapshot" DECIMAL(10,2) NOT NULL,
    "carbsSnapshot" DECIMAL(10,2) NOT NULL,
    "fatSnapshot" DECIMAL(10,2) NOT NULL,
    "servings" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MealFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPreset" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "defaultMealType" "MealType",
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MealPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPresetFood" (
    "id" UUID NOT NULL,
    "presetId" UUID NOT NULL,
    "foodId" UUID NOT NULL,
    "order" INTEGER NOT NULL,
    "servings" DECIMAL(10,3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MealPresetFood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BodyRecord" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weight" DECIMAL(7,2) NOT NULL,
    "bodyFat" DECIMAL(4,1),
    "muscleMass" DECIMAL(7,2),
    "waist" DECIMAL(7,2),
    "memo" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "BodyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_catalogKey_key" ON "Exercise"("catalogKey");

-- CreateIndex
CREATE INDEX "Exercise_ownerId_archivedAt_idx" ON "Exercise"("ownerId", "archivedAt");

-- CreateIndex
CREATE INDEX "ExerciseFavorite_exerciseId_idx" ON "ExerciseFavorite"("exerciseId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_date_idx" ON "WorkoutSession"("userId", "date");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_status_updatedAt_idx" ON "WorkoutSession"("userId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutExercise_workoutSessionId_order_key" ON "WorkoutExercise"("workoutSessionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSet_workoutExerciseId_setNumber_key" ON "WorkoutSet"("workoutExerciseId", "setNumber");

-- CreateIndex
CREATE INDEX "WorkoutRoutine_userId_updatedAt_idx" ON "WorkoutRoutine"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "RoutineExercise_exerciseId_idx" ON "RoutineExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "RoutineExercise_routineId_order_key" ON "RoutineExercise"("routineId", "order");

-- CreateIndex
CREATE INDEX "CardioRecord_userId_date_idx" ON "CardioRecord"("userId", "date");

-- CreateIndex
CREATE INDEX "CardioRecord_userId_exerciseId_date_idx" ON "CardioRecord"("userId", "exerciseId", "date");

-- CreateIndex
CREATE INDEX "CardioRecord_exerciseId_idx" ON "CardioRecord"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_catalogKey_key" ON "Food"("catalogKey");

-- CreateIndex
CREATE INDEX "Food_ownerId_archivedAt_idx" ON "Food"("ownerId", "archivedAt");

-- CreateIndex
CREATE INDEX "FoodFavorite_foodId_idx" ON "FoodFavorite"("foodId");

-- CreateIndex
CREATE INDEX "Meal_userId_date_mealType_idx" ON "Meal"("userId", "date", "mealType");

-- CreateIndex
CREATE INDEX "MealFood_foodId_idx" ON "MealFood"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "MealFood_mealId_order_key" ON "MealFood"("mealId", "order");

-- CreateIndex
CREATE INDEX "MealPreset_userId_updatedAt_idx" ON "MealPreset"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "MealPresetFood_foodId_idx" ON "MealPresetFood"("foodId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPresetFood_presetId_order_key" ON "MealPresetFood"("presetId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "BodyRecord_userId_date_key" ON "BodyRecord"("userId", "date");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseFavorite" ADD CONSTRAINT "ExerciseFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseFavorite" ADD CONSTRAINT "ExerciseFavorite_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_sourceRoutineId_fkey" FOREIGN KEY ("sourceRoutineId") REFERENCES "WorkoutRoutine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutRoutine" ADD CONSTRAINT "WorkoutRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "WorkoutRoutine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Food" ADD CONSTRAINT "Food_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodFavorite" ADD CONSTRAINT "FoodFavorite_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPreset" ADD CONSTRAINT "MealPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPresetFood" ADD CONSTRAINT "MealPresetFood_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "MealPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPresetFood" ADD CONSTRAINT "MealPresetFood_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Domain constraints not expressible in Prisma schema.
ALTER TABLE "User" ADD CONSTRAINT "User_check_0" CHECK ("email" = lower(btrim("email")));
ALTER TABLE "User" ADD CONSTRAINT "User_check_1" CHECK (length("email") BETWEEN 3 AND 254);
ALTER TABLE "User" ADD CONSTRAINT "User_check_2" CHECK (length(btrim("name")) BETWEEN 1 AND 100);
ALTER TABLE "Session" ADD CONSTRAINT "Session_check_0" CHECK ("expiresAt" > "createdAt");
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_check_0" CHECK ("targetWeight" > 0);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_check_1" CHECK ("dailyCalories" > 0);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_check_2" CHECK ("proteinGoal" > 0);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_check_3" CHECK ("carbGoal" > 0);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_check_4" CHECK ("fatGoal" > 0);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_check_5" CHECK ("weeklyWorkoutGoal" BETWEEN 1 AND 7);
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_check_0" CHECK (length(btrim("name")) BETWEEN 1 AND 100);
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_check_1" CHECK (("trackingType" = 'STRENGTH' AND "cardioInputMode" IS NULL) OR ("trackingType" = 'CARDIO' AND "cardioInputMode" IS NOT NULL));
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_check_2" CHECK ("catalogKey" IS NULL OR "ownerId" IS NULL);
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_check_0" CHECK ("revision" >= 1);
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_check_1" CHECK (length("memo") <= 2000);
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_check_2" CHECK (("status" = 'IN_PROGRESS' AND "endedAt" IS NULL AND "durationSeconds" IS NULL) OR ("status" = 'COMPLETED' AND "endedAt" IS NOT NULL AND "durationSeconds" IS NOT NULL AND "endedAt" >= "startedAt" AND "durationSeconds" >= 0 AND "durationSeconds" = floor(extract(epoch from ("endedAt" - "startedAt")))));
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_check_0" CHECK ("order" >= 0);
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_check_0" CHECK ("setNumber" >= 1);
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_check_1" CHECK ("weight" >= 0);
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_check_2" CHECK ("reps" > 0);
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_check_3" CHECK ("rpe" BETWEEN 1 AND 10 AND mod("rpe", 0.5) = 0);
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_check_4" CHECK (NOT "completed" OR "reps" IS NOT NULL);
ALTER TABLE "WorkoutRoutine" ADD CONSTRAINT "WorkoutRoutine_check_0" CHECK (length(btrim("name")) BETWEEN 1 AND 100);
ALTER TABLE "WorkoutRoutine" ADD CONSTRAINT "WorkoutRoutine_check_1" CHECK (length("description") <= 2000);
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_check_0" CHECK ("order" >= 0);
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_check_1" CHECK ("defaultSets" > 0);
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_check_2" CHECK ("defaultReps" > 0);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_check_0" CHECK ("durationSeconds" > 0);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_check_1" CHECK ("distanceKm" > 0);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_check_2" CHECK ("repetitions" > 0);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_check_3" CHECK ("calories" >= 0);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_check_4" CHECK ("averageHeartRate" BETWEEN 1 AND 300);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_check_5" CHECK (length("memo") <= 2000);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_check_6" CHECK ("distanceKm" IS NULL OR "repetitions" IS NULL);
ALTER TABLE "Food" ADD CONSTRAINT "Food_check_0" CHECK (length(btrim("name")) BETWEEN 1 AND 100);
ALTER TABLE "Food" ADD CONSTRAINT "Food_check_1" CHECK ("servingSize" > 0);
ALTER TABLE "Food" ADD CONSTRAINT "Food_check_2" CHECK ("calories" >= 0);
ALTER TABLE "Food" ADD CONSTRAINT "Food_check_3" CHECK ("protein" >= 0);
ALTER TABLE "Food" ADD CONSTRAINT "Food_check_4" CHECK ("carbs" >= 0);
ALTER TABLE "Food" ADD CONSTRAINT "Food_check_5" CHECK ("fat" >= 0);
ALTER TABLE "Food" ADD CONSTRAINT "Food_check_6" CHECK ("catalogKey" IS NULL OR "ownerId" IS NULL);
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_check_0" CHECK (length("memo") <= 2000);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_check_0" CHECK ("order" >= 0);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_check_1" CHECK ("servingSizeSnapshot" > 0);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_check_2" CHECK ("servings" > 0);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_check_3" CHECK ("caloriesSnapshot" >= 0);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_check_4" CHECK ("proteinSnapshot" >= 0);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_check_5" CHECK ("carbsSnapshot" >= 0);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_check_6" CHECK ("fatSnapshot" >= 0);
ALTER TABLE "MealPreset" ADD CONSTRAINT "MealPreset_check_0" CHECK (length(btrim("name")) BETWEEN 1 AND 100);
ALTER TABLE "MealPresetFood" ADD CONSTRAINT "MealPresetFood_check_0" CHECK ("order" >= 0);
ALTER TABLE "MealPresetFood" ADD CONSTRAINT "MealPresetFood_check_1" CHECK ("servings" > 0);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_check_0" CHECK ("weight" > 0);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_check_1" CHECK ("bodyFat" BETWEEN 0 AND 100);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_check_2" CHECK ("muscleMass" > 0);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_check_3" CHECK ("waist" > 0);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_check_4" CHECK (length("memo") <= 2000);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_targetWeight_finite" CHECK ("targetWeight" <> 'NaN'::numeric);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_dailyCalories_finite" CHECK ("dailyCalories" <> 'NaN'::numeric);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_proteinGoal_finite" CHECK ("proteinGoal" <> 'NaN'::numeric);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_carbGoal_finite" CHECK ("carbGoal" <> 'NaN'::numeric);
ALTER TABLE "UserGoal" ADD CONSTRAINT "UserGoal_fatGoal_finite" CHECK ("fatGoal" <> 'NaN'::numeric);
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_weight_finite" CHECK ("weight" <> 'NaN'::numeric);
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_rpe_finite" CHECK ("rpe" <> 'NaN'::numeric);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_distanceKm_finite" CHECK ("distanceKm" <> 'NaN'::numeric);
ALTER TABLE "CardioRecord" ADD CONSTRAINT "CardioRecord_calories_finite" CHECK ("calories" <> 'NaN'::numeric);
ALTER TABLE "Food" ADD CONSTRAINT "Food_servingSize_finite" CHECK ("servingSize" <> 'NaN'::numeric);
ALTER TABLE "Food" ADD CONSTRAINT "Food_calories_finite" CHECK ("calories" <> 'NaN'::numeric);
ALTER TABLE "Food" ADD CONSTRAINT "Food_protein_finite" CHECK ("protein" <> 'NaN'::numeric);
ALTER TABLE "Food" ADD CONSTRAINT "Food_carbs_finite" CHECK ("carbs" <> 'NaN'::numeric);
ALTER TABLE "Food" ADD CONSTRAINT "Food_fat_finite" CHECK ("fat" <> 'NaN'::numeric);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_servingSizeSnapshot_finite" CHECK ("servingSizeSnapshot" <> 'NaN'::numeric);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_caloriesSnapshot_finite" CHECK ("caloriesSnapshot" <> 'NaN'::numeric);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_proteinSnapshot_finite" CHECK ("proteinSnapshot" <> 'NaN'::numeric);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_carbsSnapshot_finite" CHECK ("carbsSnapshot" <> 'NaN'::numeric);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_fatSnapshot_finite" CHECK ("fatSnapshot" <> 'NaN'::numeric);
ALTER TABLE "MealFood" ADD CONSTRAINT "MealFood_servings_finite" CHECK ("servings" <> 'NaN'::numeric);
ALTER TABLE "MealPresetFood" ADD CONSTRAINT "MealPresetFood_servings_finite" CHECK ("servings" <> 'NaN'::numeric);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_weight_finite" CHECK ("weight" <> 'NaN'::numeric);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_bodyFat_finite" CHECK ("bodyFat" <> 'NaN'::numeric);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_muscleMass_finite" CHECK ("muscleMass" <> 'NaN'::numeric);
ALTER TABLE "BodyRecord" ADD CONSTRAINT "BodyRecord_waist_finite" CHECK ("waist" <> 'NaN'::numeric);

-- A child's owner is always resolved through its parent, never taken from a payload.
-- Catalog rows are locked while validating to serialize archive/ownership changes.
CREATE FUNCTION guard_exercise_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id uuid; item "Exercise"%ROWTYPE; is_new boolean;
BEGIN
  IF TG_TABLE_NAME = 'WorkoutExercise' THEN
    SELECT "userId" INTO owner_id FROM "WorkoutSession" WHERE id = NEW."workoutSessionId";
  ELSIF TG_TABLE_NAME = 'RoutineExercise' THEN
    SELECT "userId" INTO owner_id FROM "WorkoutRoutine" WHERE id = NEW."routineId";
  ELSE owner_id := NEW."userId";
  END IF;
  SELECT * INTO item FROM "Exercise" WHERE id = NEW."exerciseId" FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found' USING ERRCODE = '23503'; END IF;
  is_new := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN is_new := NEW."exerciseId" IS DISTINCT FROM OLD."exerciseId"; END IF;
  IF owner_id IS NULL OR (item."ownerId" IS NOT NULL AND item."ownerId" <> owner_id) THEN
    RAISE EXCEPTION 'Catalog ownership mismatch' USING ERRCODE = '23514';
  END IF;
  IF is_new AND item."archivedAt" IS NOT NULL THEN RAISE EXCEPTION 'Exercise archived' USING ERRCODE = '23514'; END IF;
  IF TG_TABLE_NAME IN ('WorkoutExercise', 'RoutineExercise') AND item."trackingType" <> 'STRENGTH' THEN
    RAISE EXCEPTION 'Strength exercise required' USING ERRCODE = '23514';
  END IF;
  IF TG_TABLE_NAME = 'CardioRecord' THEN
    IF item."trackingType" <> 'CARDIO' OR
      (NEW."distanceKm" IS NOT NULL AND item."cardioInputMode" <> 'DISTANCE') OR
      (NEW."repetitions" IS NOT NULL AND item."cardioInputMode" <> 'REPETITIONS') THEN
      RAISE EXCEPTION 'Invalid cardio input mode' USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME IN ('WorkoutExercise', 'CardioRecord') THEN
    IF is_new THEN NEW."exerciseNameSnapshot" := item.name;
    ELSE NEW."exerciseNameSnapshot" := OLD."exerciseNameSnapshot"; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER exercise_link BEFORE INSERT OR UPDATE ON "WorkoutExercise" FOR EACH ROW EXECUTE FUNCTION guard_exercise_link();
CREATE TRIGGER exercise_link BEFORE INSERT OR UPDATE ON "RoutineExercise" FOR EACH ROW EXECUTE FUNCTION guard_exercise_link();
CREATE TRIGGER exercise_link BEFORE INSERT OR UPDATE ON "CardioRecord" FOR EACH ROW EXECUTE FUNCTION guard_exercise_link();
CREATE TRIGGER exercise_link BEFORE INSERT OR UPDATE ON "ExerciseFavorite" FOR EACH ROW EXECUTE FUNCTION guard_exercise_link();

CREATE FUNCTION guard_food_link() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id uuid; item "Food"%ROWTYPE; is_new boolean;
BEGIN
  IF TG_TABLE_NAME = 'MealFood' THEN
    SELECT "userId" INTO owner_id FROM "Meal" WHERE id = NEW."mealId";
  ELSIF TG_TABLE_NAME = 'MealPresetFood' THEN
    SELECT "userId" INTO owner_id FROM "MealPreset" WHERE id = NEW."presetId";
  ELSE owner_id := NEW."userId";
  END IF;
  SELECT * INTO item FROM "Food" WHERE id = NEW."foodId" FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Food not found' USING ERRCODE = '23503'; END IF;
  is_new := TG_OP = 'INSERT';
  IF TG_OP = 'UPDATE' THEN is_new := NEW."foodId" IS DISTINCT FROM OLD."foodId"; END IF;
  IF owner_id IS NULL OR (item."ownerId" IS NOT NULL AND item."ownerId" <> owner_id) THEN
    RAISE EXCEPTION 'Catalog ownership mismatch' USING ERRCODE = '23514';
  END IF;
  IF is_new AND item."archivedAt" IS NOT NULL THEN RAISE EXCEPTION 'Food archived' USING ERRCODE = '23514'; END IF;
  IF TG_TABLE_NAME = 'MealFood' THEN
    IF is_new THEN
      NEW."foodNameSnapshot" := item.name;
      NEW."servingSizeSnapshot" := item."servingSize";
      NEW."servingUnitSnapshot" := item."servingUnit";
      NEW."caloriesSnapshot" := item.calories;
      NEW."proteinSnapshot" := item.protein;
      NEW."carbsSnapshot" := item.carbs;
      NEW."fatSnapshot" := item.fat;
    ELSE
      NEW."foodNameSnapshot" := OLD."foodNameSnapshot";
      NEW."servingSizeSnapshot" := OLD."servingSizeSnapshot";
      NEW."servingUnitSnapshot" := OLD."servingUnitSnapshot";
      NEW."caloriesSnapshot" := OLD."caloriesSnapshot";
      NEW."proteinSnapshot" := OLD."proteinSnapshot";
      NEW."carbsSnapshot" := OLD."carbsSnapshot";
      NEW."fatSnapshot" := OLD."fatSnapshot";
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER food_link BEFORE INSERT OR UPDATE ON "MealFood" FOR EACH ROW EXECUTE FUNCTION guard_food_link();
CREATE TRIGGER food_link BEFORE INSERT OR UPDATE ON "MealPresetFood" FOR EACH ROW EXECUTE FUNCTION guard_food_link();
CREATE TRIGGER food_link BEFORE INSERT OR UPDATE ON "FoodFavorite" FOR EACH ROW EXECUTE FUNCTION guard_food_link();

-- Ownership and parentage cannot be reassigned to bypass the child link guards.
CREATE FUNCTION immutable_columns() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE col text;
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    IF to_jsonb(NEW)->col IS DISTINCT FROM to_jsonb(OLD)->col THEN
      RAISE EXCEPTION 'Immutable ownership, parent or tracking field' USING ERRCODE = '23514';
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "Exercise" FOR EACH ROW EXECUTE FUNCTION immutable_columns('ownerId', 'trackingType', 'cardioInputMode', 'catalogKey');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "Food" FOR EACH ROW EXECUTE FUNCTION immutable_columns('ownerId', 'catalogKey');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "WorkoutSession" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "WorkoutRoutine" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "CardioRecord" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "Meal" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "MealPreset" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "BodyRecord" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "Session" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "UserGoal" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "UserPreference" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "ExerciseFavorite" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "FoodFavorite" FOR EACH ROW EXECUTE FUNCTION immutable_columns('userId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "WorkoutExercise" FOR EACH ROW EXECUTE FUNCTION immutable_columns('workoutSessionId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "WorkoutSet" FOR EACH ROW EXECUTE FUNCTION immutable_columns('workoutExerciseId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "RoutineExercise" FOR EACH ROW EXECUTE FUNCTION immutable_columns('routineId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "MealFood" FOR EACH ROW EXECUTE FUNCTION immutable_columns('mealId');
CREATE TRIGGER immutable_fields BEFORE UPDATE ON "MealPresetFood" FOR EACH ROW EXECUTE FUNCTION immutable_columns('presetId');
CREATE FUNCTION guard_source_routine() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."sourceRoutineId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "WorkoutRoutine" WHERE id = NEW."sourceRoutineId" AND "userId" = NEW."userId"
  ) THEN RAISE EXCEPTION 'Routine ownership mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER source_routine BEFORE INSERT OR UPDATE ON "WorkoutSession" FOR EACH ROW EXECUTE FUNCTION guard_source_routine();
