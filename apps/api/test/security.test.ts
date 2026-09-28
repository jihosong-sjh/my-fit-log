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

test('all domain routes reject anonymous requests and cross-origin writes before validation', async () => {
  const id = randomUUID();
  const writes: [string, string][] = [
    ['PATCH', '/settings'],
    ['POST', '/exercises'],
    ['PATCH', `/exercises/${id}`],
    ['POST', `/exercises/${id}/favorite`],
    ['PUT', `/workouts/${id}`],
    ['DELETE', `/workouts/${id}`],
    ['POST', '/routines'],
    ['PUT', `/routines/${id}`],
    ['POST', '/cardio'],
    ['POST', '/foods'],
    ['PUT', `/foods/${id}`],
    ['POST', `/foods/${id}/favorite`],
    ['POST', '/meals'],
    ['PUT', `/meals/${id}`],
    ['POST', '/meal-presets'],
    ['POST', `/meal-presets/${id}/apply`],
    ['PUT', '/body/2026-09-27'],
    ['DELETE', '/body/2026-09-27'],
  ];
  for (const path of [
    '/auth/me',
    '/settings',
    '/exercises',
    '/workouts',
    '/routines',
    '/cardio',
    '/foods',
    '/meals',
    '/meal-presets',
    '/body',
    '/dashboard',
    '/analytics',
    '/calendar',
  ]) {
    const response = await ctx.request('GET', path, undefined, '');
    assert.equal(response.status, 401, path);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  for (const [method, path] of writes) {
    assert.equal((await ctx.request(method, path, {}, '')).status, 401, path);
    for (const origin of [undefined, 'null', 'https://attacker.invalid']) {
      const response = await fetch(`${ctx.base}/api/v1${path}`, {
        method,
        headers: {
          cookie: ctx.user.cookie,
          'content-type': 'application/json',
          ...(origin ? { origin } : {}),
        },
        body: '{}',
      });
      assert.equal(response.status, 403, `${method} ${path} ${origin}`);
    }
  }
});

test('A/B ownership matrix blocks record edits, private references and injected owner IDs', async () => {
  const other = await ctx.makeUser();
  async function create(path: string, input: unknown) {
    const response = await ctx.request('POST', path, input);
    assert.equal(response.status, 201, path);
    return (await response.json()).data.id as string;
  }
  const exercise = await create('/exercises', {
    name: 'Private bench',
    trackingType: 'STRENGTH',
  });
  const cardioExercise = await create('/exercises', {
    name: 'Private run',
    trackingType: 'CARDIO',
    cardioInputMode: 'DISTANCE',
  });
  const foodInput = {
    name: 'Private food',
    servingSize: '100',
    servingUnit: 'G',
    calories: '165',
    protein: '31',
    carbs: '0',
    fat: '3.6',
  };
  const food = await create('/foods', foodInput);
  const routineInput = {
    name: 'Private routine',
    exercises: [{ exerciseId: exercise, defaultSets: 2, defaultReps: 8 }],
  };
  const routine = await create('/routines', routineInput);
  const cardioInput = {
    date: '2026-09-27',
    exerciseId: cardioExercise,
    durationSeconds: 1800,
    distanceKm: '5',
  };
  const cardio = await create('/cardio', cardioInput);
  const mealInput = {
    date: '2026-09-27',
    mealType: 'LUNCH',
    foods: [{ id: randomUUID(), foodId: food, servings: '1' }],
  };
  const meal = await create('/meals', mealInput);
  const presetInput = {
    name: 'Private preset',
    defaultMealType: 'LUNCH',
    foods: [{ foodId: food, servings: '1' }],
  };
  const preset = await create('/meal-presets', presetInput);
  const workout = randomUUID();
  const workoutInput = {
    baseRevision: null,
    mutationId: randomUUID(),
    date: '2026-09-27',
    startedAt: '2026-09-27T01:00:00Z',
    endedAt: null,
    status: 'IN_PROGRESS',
    sourceRoutineId: routine,
    memo: null,
    exercises: [],
  };
  assert.equal(
    (await ctx.request('PUT', `/workouts/${workout}`, workoutInput)).status,
    200,
  );
  const forbidden: [string, string, unknown?][] = [
    ['PATCH', `/exercises/${exercise}`, { name: 'Stolen' }],
    ['DELETE', `/exercises/${exercise}`],
    ['GET', `/exercises/${exercise}/previous`],
    ['POST', `/exercises/${exercise}/favorite`],
    ['PUT', `/foods/${food}`, foodInput],
    ['DELETE', `/foods/${food}`],
    ['POST', `/foods/${food}/favorite`],
    ['GET', `/routines/${routine}`],
    ['PUT', `/routines/${routine}`, routineInput],
    ['DELETE', `/routines/${routine}`],
    ['GET', `/cardio/${cardio}`],
    ['PUT', `/cardio/${cardio}`, cardioInput],
    ['DELETE', `/cardio/${cardio}`],
    ['GET', `/meals/${meal}`],
    ['PUT', `/meals/${meal}`, mealInput],
    ['DELETE', `/meals/${meal}`],
    ['PUT', `/meal-presets/${preset}`, presetInput],
    ['DELETE', `/meal-presets/${preset}`],
    ['POST', `/meal-presets/${preset}/apply`, { date: '2026-09-27' }],
    ['GET', `/workouts/${workout}`],
    ['PUT', `/workouts/${workout}`, { ...workoutInput, baseRevision: 1 }],
    ['DELETE', `/workouts/${workout}`, { baseRevision: 1 }],
    ['POST', '/routines', routineInput],
    ['POST', '/cardio', cardioInput],
    ['POST', '/meals', mealInput],
    ['POST', '/meal-presets', presetInput],
    [
      'PUT',
      `/workouts/${randomUUID()}`,
      { ...workoutInput, mutationId: randomUUID() },
    ],
  ];
  for (const [method, path, input] of forbidden)
    assert.equal(
      (await ctx.request(method, path, input, other.cookie)).status,
      404,
      `${method} ${path}`,
    );
  for (const path of [
    '/routines',
    '/cardio',
    '/meals',
    '/meal-presets',
    '/workouts',
    '/foods',
  ])
    assert.deepEqual(
      (await (await ctx.request('GET', path, undefined, other.cookie)).json())
        .data,
      [],
      path,
    );
  assert.equal(
    (
      await ctx.request(
        'POST',
        '/foods',
        { ...foodInput, ownerId: ctx.user.id },
        other.cookie,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await ctx.request(
        'PATCH',
        '/settings',
        { userId: ctx.user.id },
        other.cookie,
      )
    ).status,
    400,
  );
  for (const path of ['/foods', '/exercises']) {
    const response = await ctx.request(
      'GET',
      `${path}?search=${encodeURIComponent("' OR 1=1; DROP TABLE User; --")}`,
      undefined,
      other.cookie,
    );
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).data, []);
  }
  assert.equal(await ctx.db.user.count({ where: { id: ctx.user.id } }), 1);
});
