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
test('analytics respects missing dates, completed-set maxima, weighted pace and repetition-only cardio', async () => {
  const strength = await ctx.db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'strength-squat' },
  });
  const running = await ctx.db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'cardio-running' },
  });
  const rope = (
    await (
      await ctx.request('POST', '/exercises', {
        name: 'Analytics rope',
        trackingType: 'CARDIO',
        cardioInputMode: 'REPETITIONS',
      })
    ).json()
  ).data;
  await ctx.request('PUT', `/workouts/${randomUUID()}`, {
    baseRevision: null,
    mutationId: randomUUID(),
    date: '2026-09-21',
    startedAt: '2026-09-21T00:00:00Z',
    endedAt: '2026-09-21T00:10:00Z',
    status: 'COMPLETED',
    exercises: [
      {
        id: randomUUID(),
        exerciseId: strength.id,
        sets: [
          { id: randomUUID(), weight: '80', reps: 8, completed: true },
          { id: randomUUID(), weight: '90', reps: 5, completed: true },
          { id: randomUUID(), weight: '100', reps: 8, completed: false },
        ],
      },
    ],
  });
  await ctx.request('POST', '/cardio', {
    date: '2026-09-21',
    exerciseId: running.id,
    durationSeconds: 600,
    distanceKm: '2',
  });
  await ctx.request('POST', '/cardio', {
    date: '2026-09-22',
    exerciseId: running.id,
    durationSeconds: 3000,
  });
  await ctx.request('POST', '/cardio', {
    date: '2026-09-23',
    exerciseId: rope.id,
    durationSeconds: 60,
    repetitions: 100,
  });
  await ctx.request('POST', '/cardio', {
    date: '2026-09-23',
    exerciseId: rope.id,
    durationSeconds: 30,
    repetitions: 50,
  });
  for (const [date, weight] of [
    ['2026-09-21', '80'],
    ['2026-09-23', '82'],
  ])
    await ctx.request('PUT', `/body/${date}`, { weight });
  const food = await ctx.db.food.create({
    data: {
      ownerId: ctx.user.id,
      name: 'Analytics food',
      servingSize: '100',
      servingUnit: 'G',
      calories: '80',
      protein: '8',
      carbs: '0',
      fat: '0',
    },
  });
  await ctx.request('POST', '/meals', {
    date: '2026-09-23',
    mealType: 'LUNCH',
    foods: [{ id: randomUUID(), foodId: food.id, servings: '2.5' }],
  });
  await ctx.request('PATCH', '/settings', { dailyCalories: '100' });
  let data = (
    await (
      await ctx.request('GET', '/analytics?from=2026-09-21&to=2026-09-27')
    ).json()
  ).data;
  assert.equal(data.workout.volume, '1090');
  assert.equal(data.workout.exerciseTrends[0].points[0].weight, '90');
  assert.equal(data.workout.workoutCount, 1);
  assert.equal(data.workout.durationSeconds, 4290);
  assert.equal(data.nutrition.averageCalories, '200');
  assert.equal(data.nutrition.goalAchievement, '200');
  assert.equal(data.nutrition.series[0].calories, null);
  assert.equal(data.weight.difference, '2');
  const run = data.cardio.find(
    (c: { exerciseId: string }) => c.exerciseId === running.id,
  );
  assert.equal(run.durationSeconds, 3600);
  assert.equal(run.paceSecondsPerKm, '300');
  assert.equal(run.distanceKm, '2');
  const jump = data.cardio.find(
    (c: { exerciseId: string }) => c.exerciseId === rope.id,
  );
  assert.equal(jump.repetitions, 150);
  assert.equal(jump.paceSecondsPerKm, null);
  assert.equal(jump.points[2].durationSeconds, 90);
  await ctx.request('PATCH', '/settings', { dailyCalories: '200' });
  await ctx.request('DELETE', `/exercises/${rope.id}`);
  data = (
    await (
      await ctx.request('GET', '/analytics?from=2026-09-22&to=2026-09-27')
    ).json()
  ).data;
  assert.equal(data.weight.series[0].weight, null);
  assert.equal(data.weight.series[0].average, '80');
  assert.equal(data.nutrition.goalAchievement, '100');
  assert.equal(
    data.cardio.find((c: { exerciseId: string }) => c.exerciseId === rope.id)
      .repetitions,
    150,
  );
  assert.equal(
    (await ctx.request('GET', '/analytics?from=2026-09-27&to=2026-09-21'))
      .status,
    400,
  );
  const other = await ctx.makeUser();
  const empty = (
    await (
      await ctx.request(
        'GET',
        '/analytics?from=2026-09-21&to=2026-09-27',
        undefined,
        other.cookie,
      )
    ).json()
  ).data;
  assert.equal(empty.nutrition.averageCalories, null);
  assert.equal(empty.cardio.length, 0);
  assert.equal(empty.weight.difference, null);
});
