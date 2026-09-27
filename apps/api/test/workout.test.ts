import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { testContext } from './helpers';
let ctx: Awaited<ReturnType<typeof testContext>>;
let exerciseId: string;
const payload = () => ({
  baseRevision: null as number | null,
  mutationId: randomUUID(),
  date: '2026-09-27',
  startedAt: '2026-09-27T01:00:00Z',
  endedAt: null as string | null,
  status: 'IN_PROGRESS',
  sourceRoutineId: null as string | null,
  memo: null,
  exercises: [
    {
      id: randomUUID(),
      exerciseId,
      sets: [
        {
          id: randomUUID(),
          weight: '80',
          reps: 8,
          rpe: '7.5',
          completed: true,
        },
      ],
    },
  ],
});
before(async () => {
  ctx = await testContext();
  const response = await ctx.request('POST', '/exercises', {
    name: 'Original bench',
    trackingType: 'STRENGTH',
  });
  assert.equal(response.status, 201);
  exerciseId = (await response.json()).data.id;
});
after(async () => {
  await ctx?.close();
});
test('atomic save, replay, canonical hash, revision conflict and completed volume', async () => {
  const id = randomUUID();
  const input = payload();
  const first = await ctx.request('PUT', `/workouts/${id}`, input);
  assert.equal(first.status, 200);
  const saved = (await first.json()).data;
  assert.equal(saved.revision, 1);
  assert.equal(saved.volume, '640');
  const repeat = await ctx.request(
    'PUT',
    `/workouts/${id}`,
    Object.fromEntries(Object.entries(input).reverse()),
  );
  assert.equal(repeat.status, 200);
  assert.equal((await repeat.json()).data.revision, 1);
  assert.equal(
    (
      await ctx.request('PUT', `/workouts/${id}`, {
        ...input,
        memo: 'different',
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await ctx.request('PUT', `/workouts/${id}`, {
        ...input,
        mutationId: randomUUID(),
      })
    ).status,
    409,
  );
  const completed = {
    ...input,
    baseRevision: 1,
    mutationId: randomUUID(),
    status: 'COMPLETED',
    endedAt: '2026-09-27T02:00:00Z',
  };
  assert.equal(
    (await ctx.request('PUT', `/workouts/${id}`, completed)).status,
    200,
  );
  const row = (await (await ctx.request('GET', `/workouts/${id}`)).json()).data;
  assert.equal(row.durationSeconds, 3600);
  assert.equal(row.totalSets, 1);
  assert.equal(row.volume, '640');
  const previous = (
    await (await ctx.request('GET', `/exercises/${exerciseId}/previous`)).json()
  ).data;
  assert.equal(previous.sets[0].weight, '80');
  await ctx.request('PATCH', `/exercises/${exerciseId}`, {
    name: 'Renamed bench',
  });
  const edited = { ...completed, baseRevision: 2, mutationId: randomUUID() };
  assert.equal(
    (await ctx.request('PUT', `/workouts/${id}`, edited)).status,
    200,
  );
  assert.equal(
    (
      await ctx.db.workoutExercise.findUniqueOrThrow({
        where: { id: input.exercises[0]!.id },
      })
    ).exerciseNameSnapshot,
    'Original bench',
  );
  assert.equal(
    (await ctx.request('DELETE', `/workouts/${id}`, { baseRevision: 2 }))
      .status,
    409,
  );
  assert.equal(
    (await ctx.request('DELETE', `/workouts/${id}`, { baseRevision: 3 }))
      .status,
    200,
  );
  assert.equal(
    (await ctx.request('PUT', `/workouts/${id}`, edited)).status,
    404,
  );
});
test('concurrent saves serialize, invalid sets rollback and foreign IDs cannot be moved', async () => {
  const id = randomUUID();
  const input = payload();
  await ctx.request('PUT', `/workouts/${id}`, input);
  const writes = await Promise.all(
    ['a', 'b'].map((memo) =>
      ctx.request('PUT', `/workouts/${id}`, {
        ...input,
        baseRevision: 1,
        mutationId: randomUUID(),
        memo,
      }),
    ),
  );
  assert.deepEqual(writes.map((r) => r.status).sort(), [200, 409]);
  const other = await ctx.makeUser();
  assert.equal(
    (await ctx.request('GET', `/workouts/${id}`, undefined, other.cookie))
      .status,
    404,
  );
  assert.equal(
    (
      await ctx.request(
        'PUT',
        `/workouts/${id}`,
        { ...input, baseRevision: 2, mutationId: randomUUID() },
        other.cookie,
      )
    ).status,
    404,
  );
  const invalid = payload();
  invalid.exercises[0]!.sets[0]!.rpe = '7.3';
  const badId = randomUUID();
  assert.equal(
    (await ctx.request('PUT', `/workouts/${badId}`, invalid)).status,
    400,
  );
  assert.equal(await ctx.db.workoutSession.count({ where: { id: badId } }), 0);
  const empty = payload();
  empty.exercises = [];
  empty.status = 'COMPLETED';
  empty.endedAt = '2026-09-27T02:00:00Z';
  assert.equal(
    (await ctx.request('PUT', `/workouts/${randomUUID()}`, empty)).status,
    400,
  );
  assert.equal(
    (await ctx.request('PUT', `/workouts/${randomUUID()}`, input)).status,
    404,
  );
  assert.equal(
    (
      await ctx.request(
        'POST',
        `/exercises/${exerciseId}/favorite`,
        undefined,
        other.cookie,
      )
    ).status,
    404,
  );
});
test('exercise/set reordering and removal preserves IDs and cascades only removed rows', async () => {
  const id = randomUUID();
  const input = payload();
  input.exercises.push({
    id: randomUUID(),
    exerciseId,
    sets: [
      { id: randomUUID(), weight: '60', reps: 10, rpe: '6', completed: false },
    ],
  });
  await ctx.request('PUT', `/workouts/${id}`, input);
  input.exercises.reverse();
  let response = await ctx.request('PUT', `/workouts/${id}`, {
    ...input,
    baseRevision: 1,
    mutationId: randomUUID(),
  });
  assert.equal(response.status, 200);
  assert.equal(
    (await response.json()).data.exercises[0].id,
    input.exercises[0]!.id,
  );
  const removed = input.exercises.pop()!;
  response = await ctx.request('PUT', `/workouts/${id}`, {
    ...input,
    baseRevision: 2,
    mutationId: randomUUID(),
  });
  assert.equal(response.status, 200);
  assert.equal(
    await ctx.db.workoutSet.count({ where: { workoutExerciseId: removed.id } }),
    0,
  );
});
test('routine CRUD, copy snapshot, favorites and archive restriction', async () => {
  await ctx.request('POST', `/exercises/${exerciseId}/favorite`);
  const favorites = (
    await (await ctx.request('GET', '/exercises?favorite=true')).json()
  ).data;
  assert.ok(favorites.some((e: { id: string }) => e.id === exerciseId));
  const response = await ctx.request('POST', '/routines', {
    name: 'Push',
    exercises: [{ exerciseId, defaultSets: 2, defaultReps: 8 }],
  });
  assert.equal(response.status, 201);
  const routine = (await response.json()).data;
  const input = payload();
  input.sourceRoutineId = routine.id;
  input.exercises[0]!.sets.push({
    ...input.exercises[0]!.sets[0]!,
    id: randomUUID(),
  });
  const id = randomUUID();
  await ctx.request('PUT', `/workouts/${id}`, input);
  await ctx.request('PUT', `/routines/${routine.id}`, {
    name: 'Changed',
    exercises: [],
  });
  assert.equal(
    await ctx.db.workoutSet.count({
      where: { workoutExercise: { workoutSessionId: id } },
    }),
    2,
  );
  await ctx.request('DELETE', `/routines/${routine.id}`);
  assert.equal(
    (await ctx.db.workoutSession.findUniqueOrThrow({ where: { id } }))
      .sourceRoutineId,
    null,
  );
  await ctx.request('DELETE', `/exercises/${exerciseId}`);
  assert.equal(
    (await ctx.request('PUT', `/workouts/${randomUUID()}`, payload())).status,
    400,
  );
  assert.equal(
    (
      await ctx.request('PUT', `/workouts/${id}`, {
        ...input,
        baseRevision: 1,
        mutationId: randomUUID(),
      })
    ).status,
    200,
  );
  assert.equal(
    (await (await ctx.request('GET', '/exercises?favorite=true')).json()).data
      .length,
    0,
  );
});
test('running/jump-rope CRUD, pace, invalid mode and private ownership', async () => {
  const rows = (
    await (await ctx.request('GET', '/exercises?trackingType=CARDIO')).json()
  ).data;
  const running = rows.find(
    (e: { catalogKey: string }) => e.catalogKey === 'cardio-running',
  );
  const rope = rows.find(
    (e: { catalogKey: string }) => e.catalogKey === 'cardio-jump-rope',
  );
  const input = {
    date: '2026-09-27',
    exerciseId: running.id,
    durationSeconds: 1500,
    distanceKm: '5',
  };
  let response = await ctx.request('POST', '/cardio', input);
  assert.equal(response.status, 201);
  const id = (await response.json()).data.id;
  assert.equal(
    (await (await ctx.request('GET', `/cardio/${id}`)).json()).data
      .paceSecondsPerKm,
    '300',
  );
  assert.equal(
    (
      await ctx.request('PUT', `/cardio/${id}`, {
        ...input,
        exerciseId: rope.id,
      })
    ).status,
    400,
  );
  response = await ctx.request('PUT', `/cardio/${id}`, {
    date: input.date,
    exerciseId: rope.id,
    durationSeconds: 300,
    repetitions: 500,
  });
  assert.equal(response.status, 200);
  const record = (await (await ctx.request('GET', `/cardio/${id}`)).json())
    .data;
  assert.equal(record.repetitions, 500);
  assert.equal(record.distanceKm, null);
  assert.equal(record.paceSecondsPerKm, null);
  const other = await ctx.makeUser();
  assert.equal(
    (await ctx.request('DELETE', `/cardio/${id}`, undefined, other.cookie))
      .status,
    404,
  );
  assert.equal((await ctx.request('DELETE', `/cardio/${id}`)).status, 200);
});
