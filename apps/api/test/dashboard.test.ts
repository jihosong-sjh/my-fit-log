import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { testContext } from './helpers';
let ctx: Awaited<ReturnType<typeof testContext>>;
before(async () => {
  ctx = await testContext();
});
after(async () => {
  await ctx?.close();
});
test('single dashboard aggregates completed work, distinct days, recorded-day nutrition and date-aware weight', async () => {
  const exercise = await ctx.db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'strength-bench-press' },
  });
  const running = await ctx.db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'cardio-running' },
  });
  const input = {
    baseRevision: null,
    mutationId: randomUUID(),
    date: '2026-09-21',
    status: 'COMPLETED',
    startedAt: '2026-09-21T00:00:00Z',
    endedAt: '2026-09-21T00:10:00Z',
    memo: null,
    exercises: [
      {
        id: randomUUID(),
        exerciseId: exercise.id,
        sets: [
          {
            id: randomUUID(),
            weight: '80',
            reps: 8,
            rpe: null,
            completed: true,
          },
          {
            id: randomUUID(),
            weight: '100',
            reps: 10,
            rpe: null,
            completed: false,
          },
        ],
      },
    ],
  };
  assert.equal(
    (await ctx.request('PUT', `/workouts/${randomUUID()}`, input)).status,
    200,
  );
  await ctx.request('PUT', `/workouts/${randomUUID()}`, {
    ...input,
    mutationId: randomUUID(),
    date: '2026-09-22',
    status: 'IN_PROGRESS',
    endedAt: null,
    exercises: [
      {
        ...input.exercises[0],
        id: randomUUID(),
        sets: [{ ...input.exercises[0]!.sets[0], id: randomUUID() }],
      },
    ],
  });
  await ctx.request('POST', '/cardio', {
    date: '2026-09-21',
    exerciseId: running.id,
    durationSeconds: 1200,
    distanceKm: '2',
  });
  await ctx.request('POST', '/cardio', {
    date: '2026-09-23',
    exerciseId: running.id,
    durationSeconds: 300,
  });
  const food = await ctx.db.food.create({
    data: {
      ownerId: ctx.user.id,
      name: 'Meal fixture',
      servingSize: '100',
      servingUnit: 'G',
      calories: '100',
      protein: '10',
      carbs: '5',
      fat: '2',
    },
  });
  for (const [date, servings] of [
    ['2026-09-21', '1'],
    ['2026-09-21', '2'],
    ['2026-09-23', '1'],
  ])
    await ctx.request('POST', '/meals', {
      date,
      mealType: 'LUNCH',
      foods: [{ id: randomUUID(), foodId: food.id, servings }],
    });
  for (const [date, weight] of [
    ['2026-09-14', '90'],
    ['2026-09-21', '80'],
    ['2026-09-27', '82'],
  ])
    await ctx.request('PUT', `/body/${date}`, { weight });
  await ctx.request('PATCH', '/settings', {
    dailyCalories: '150',
    proteinGoal: '20',
    weeklyWorkoutGoal: 4,
  });
  let data = (
    await (await ctx.request('GET', '/dashboard?date=2026-09-27')).json()
  ).data;
  assert.equal(data.weekly.workoutCount, 1);
  assert.equal(data.weekly.workoutDays, 2);
  assert.equal(data.weekly.durationSeconds, 2100);
  assert.equal(data.weekly.volume, '640');
  assert.equal(data.weekly.averageCalories, '200');
  assert.equal(data.weekly.averageProtein, '20');
  assert.equal(data.weekly.recordedDays, 2);
  assert.equal(data.weekly.weightChange, '2');
  assert.equal(data.weekly.goalPercentage, '50');
  assert.equal(data.body.current.date, '2026-09-27');
  assert.equal(data.body.average, '81');
  assert.equal(data.body.previousPeriodChange, '-9');
  assert.equal(data.nutrition.recorded, false);
  data = (await (await ctx.request('GET', '/dashboard?date=2026-09-21')).json())
    .data;
  assert.equal(data.body.current.weight, '80');
  assert.equal(data.nutrition.progress.calories, '200');
  assert.equal(data.nutrition.totals.calories, '300');
  await ctx.request('PATCH', '/settings', { dailyCalories: '300' });
  assert.equal(
    (await (await ctx.request('GET', '/dashboard?date=2026-09-21')).json()).data
      .nutrition.progress.calories,
    '100',
  );
  const other = await ctx.makeUser();
  const empty = (
    await (
      await ctx.request(
        'GET',
        '/dashboard?date=2026-09-27',
        undefined,
        other.cookie,
      )
    ).json()
  ).data;
  assert.equal(empty.weekly.workoutDays, 0);
  assert.equal(empty.weekly.averageCalories, null);
  assert.equal(empty.body.current, null);
  assert.equal(empty.nutrition.progress.calories, null);
});
