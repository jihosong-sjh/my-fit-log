import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabase, UserStore } from './index';
import { seedCatalog } from './catalog';
const url = process.env.DATABASE_URL!;
if (new URL(url).pathname !== '/myfit_test')
  throw new Error('Isolated test database required');
const db = createDatabase(url);
const ids = [randomUUID(), randomUUID()];
const userId = ids[0]!;
const otherId = ids[1]!;
const date = new Date('2026-09-27T00:00:00Z');
let exerciseId: string;
let foodId: string;
let routineId: string;
before(async () => {
  await db.user.createMany({
    data: ids.map((id) => ({
      id,
      email: `${id}@test.invalid`,
      name: 'Test fixture',
      passwordHash: 'test-only-not-a-password',
    })),
  });
  exerciseId = (
    await db.exercise.create({
      data: {
        ownerId: userId,
        name: 'Original exercise',
        trackingType: 'STRENGTH',
        category: 'TEST',
        muscleGroup: 'BACK',
      },
    })
  ).id;
  foodId = (
    await db.food.create({
      data: {
        ownerId: userId,
        name: 'Original food',
        servingSize: '100',
        servingUnit: 'G',
        calories: '165',
        protein: '31',
        carbs: '0',
        fat: '3.6',
      },
    })
  ).id;
  routineId = (
    await db.workoutRoutine.create({
      data: {
        userId,
        name: 'Routine',
        exercises: {
          create: { exerciseId, order: 0, defaultSets: 3, defaultReps: 8 },
        },
      },
    })
  ).id;
});
after(async () => {
  const where = { userId: { in: ids } };
  await db.workoutSession.deleteMany({ where });
  await db.workoutRoutine.deleteMany({ where });
  await db.cardioRecord.deleteMany({ where });
  await db.meal.deleteMany({ where });
  await db.mealPreset.deleteMany({ where });
  await db.bodyRecord.deleteMany({ where });
  await db.exerciseFavorite.deleteMany({ where });
  await db.foodFavorite.deleteMany({ where });
  await db.exercise.deleteMany({ where: { ownerId: { in: ids } } });
  await db.food.deleteMany({ where: { ownerId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
});
test('20 catalog entries are idempotent and contain no personal accounts', async () => {
  await seedCatalog(db);
  await seedCatalog(db);
  assert.equal(
    await db.exercise.count({
      where: { catalogKey: { startsWith: 'strength-' } },
    }),
    13,
  );
  assert.equal(
    await db.exercise.count({
      where: { catalogKey: { startsWith: 'cardio-' } },
    }),
    7,
  );
  assert.equal(
    (
      await db.exercise.findUniqueOrThrow({
        where: { catalogKey: 'cardio-jump-rope' },
      })
    ).cardioInputMode,
    'REPETITIONS',
  );
});
test('range, daily uniqueness and FK constraints reject invalid records', async () => {
  await assert.rejects(
    db.bodyRecord.create({ data: { userId, date, weight: '-1' } }),
  );
  await assert.rejects(
    db.bodyRecord.create({ data: { userId, date, weight: 'NaN' } }),
  );
  await assert.rejects(
    db.bodyRecord.create({
      data: { userId, date, weight: '80', bodyFat: '101' },
    }),
  );
  await db.bodyRecord.create({ data: { userId, date, weight: '80.25' } });
  await assert.rejects(
    db.bodyRecord.create({ data: { userId, date, weight: '81' } }),
  );
  await assert.rejects(
    db.bodyRecord.create({
      data: { userId: randomUUID(), date, weight: '80' },
    }),
  );
  await assert.rejects(
    db.userGoal.create({ data: { userId, weeklyWorkoutGoal: 8 } }),
  );
  await db.userGoal.create({ data: { userId } });
  assert.equal(
    (await db.userGoal.findUniqueOrThrow({ where: { userId } })).targetWeight,
    null,
  );
  await db.userPreference.create({ data: { userId } });
  assert.equal(
    (await db.userPreference.findUniqueOrThrow({ where: { userId } })).theme,
    'SYSTEM',
  );
});
test('private catalog links, public modification and owner changes are blocked', async () => {
  await assert.rejects(
    db.exerciseFavorite.create({ data: { userId: otherId, exerciseId } }),
  );
  await assert.rejects(
    db.foodFavorite.create({ data: { userId: otherId, foodId } }),
  );
  const publicExercise = await db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'strength-squat' },
  });
  await assert.rejects(
    new UserStore(db, userId).archiveExercise(publicExercise.id),
  );
  assert.ok(
    !(await new UserStore(db, otherId).exercises()).some(
      (e) => e.id === exerciseId,
    ),
  );
  await assert.rejects(
    db.exercise.update({
      where: { id: exerciseId },
      data: { ownerId: otherId },
    }),
  );
  await assert.rejects(
    new UserStore(db, otherId).copyRoutine(routineId, '2026-09-27', date),
  );
});
test('routine copy, immutable snapshots, duplicate order, completed set rules and cascade/restrict', async () => {
  const workout = await new UserStore(db, userId).copyRoutine(
    routineId,
    '2026-09-27',
    date,
  );
  const exercise = workout.exercises[0]!;
  assert.equal(exercise.sets.length, 3);
  await assert.rejects(
    db.workoutExercise.create({
      data: {
        workoutSessionId: workout.id,
        exerciseId,
        exerciseNameSnapshot: 'injected',
        order: 0,
      },
    }),
  );
  await assert.rejects(
    db.workoutSet.create({
      data: { workoutExerciseId: exercise.id, setNumber: 4, completed: true },
    }),
  );
  await assert.rejects(
    db.workoutSet.create({
      data: {
        workoutExerciseId: exercise.id,
        setNumber: 4,
        reps: 8,
        rpe: '7.3',
      },
    }),
  );
  await assert.rejects(
    db.workoutSession.update({
      where: { id: workout.id },
      data: { status: 'COMPLETED' },
    }),
  );
  await db.exercise.update({
    where: { id: exerciseId },
    data: { name: 'Renamed exercise' },
  });
  await db.workoutExercise.update({
    where: { id: exercise.id },
    data: { exerciseNameSnapshot: 'injected' },
  });
  assert.equal(
    (await db.workoutExercise.findUniqueOrThrow({ where: { id: exercise.id } }))
      .exerciseNameSnapshot,
    'Original exercise',
  );
  await assert.rejects(db.exercise.delete({ where: { id: exerciseId } }));
  await db.workoutRoutine.delete({ where: { id: routineId } });
  assert.equal(
    (await db.workoutSession.findUniqueOrThrow({ where: { id: workout.id } }))
      .sourceRoutineId,
    null,
  );
  assert.equal(
    await db.workoutSet.count({ where: { workoutExerciseId: exercise.id } }),
    3,
  );
  await db.workoutSession.delete({ where: { id: workout.id } });
  assert.equal(
    await db.workoutSet.count({ where: { workoutExerciseId: exercise.id } }),
    0,
  );
});
test('meal snapshots preserve original nutrition after catalog edit/archive, cascade and archived links', async () => {
  const meal = await db.meal.create({
    data: {
      userId,
      date,
      mealType: 'LUNCH',
      foods: {
        create: {
          foodId,
          order: 0,
          foodNameSnapshot: 'injected',
          servingSizeSnapshot: '1',
          servingUnitSnapshot: 'PACK',
          caloriesSnapshot: '1',
          proteinSnapshot: '1',
          carbsSnapshot: '1',
          fatSnapshot: '1',
          servings: '2',
        },
      },
    },
    include: { foods: true },
  });
  assert.equal(meal.foods[0]!.caloriesSnapshot.toString(), '165');
  await db.food.update({
    where: { id: foodId },
    data: { name: 'Changed', calories: '200', archivedAt: new Date() },
  });
  const row = await db.mealFood.update({
    where: { id: meal.foods[0]!.id },
    data: { servings: '3', caloriesSnapshot: '999' },
  });
  assert.equal(row.caloriesSnapshot.toString(), '165');
  assert.equal(row.foodNameSnapshot, 'Original food');
  await assert.rejects(db.foodFavorite.create({ data: { userId, foodId } }));
  await assert.rejects(db.food.delete({ where: { id: foodId } }));
  await db.meal.delete({ where: { id: meal.id } });
  assert.equal(await db.mealFood.count({ where: { mealId: meal.id } }), 0);
});
test('cardio mode validation and archive preserve editable history', async () => {
  const running = await db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'cardio-running' },
  });
  const rope = await db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'cardio-jump-rope' },
  });
  await assert.rejects(
    db.cardioRecord.create({
      data: {
        userId,
        date,
        exerciseId: running.id,
        exerciseNameSnapshot: 'x',
        durationSeconds: 60,
        repetitions: 100,
      },
    }),
  );
  await assert.rejects(
    db.cardioRecord.create({
      data: {
        userId,
        date,
        exerciseId: rope.id,
        exerciseNameSnapshot: 'x',
        durationSeconds: 60,
        distanceKm: '1',
      },
    }),
  );
  const record = await db.cardioRecord.create({
    data: {
      userId,
      date,
      exerciseId: rope.id,
      exerciseNameSnapshot: 'x',
      durationSeconds: 60,
      repetitions: 100,
    },
  });
  assert.equal(record.exerciseNameSnapshot, '줄넘기');
  await db.cardioRecord.update({
    where: { id: record.id },
    data: { repetitions: 120 },
  });
  const custom = await db.exercise.create({
    data: {
      ownerId: userId,
      name: 'Custom cardio',
      trackingType: 'CARDIO',
      cardioInputMode: 'DURATION',
      category: 'CARDIO',
      muscleGroup: 'FULL_BODY',
    },
  });
  const history = await db.cardioRecord.create({
    data: {
      userId,
      date,
      exerciseId: custom.id,
      exerciseNameSnapshot: 'x',
      durationSeconds: 60,
    },
  });
  await new UserStore(db, userId).archiveExercise(custom.id);
  await db.cardioRecord.update({
    where: { id: history.id },
    data: { durationSeconds: 90 },
  });
  await assert.rejects(
    db.cardioRecord.create({
      data: {
        userId,
        date,
        exerciseId: custom.id,
        exerciseNameSnapshot: 'x',
        durationSeconds: 60,
      },
    }),
  );
});
