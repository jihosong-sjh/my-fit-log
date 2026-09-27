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
test('calendar month boundaries, leap month, cardio/ongoing indicators and exact-day detail', async () => {
  const exercise = await ctx.db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'cardio-running' },
  });
  for (const date of ['2026-08-31', '2026-09-01'])
    await ctx.request('POST', '/cardio', {
      date,
      exerciseId: exercise.id,
      durationSeconds: 60,
    });
  await ctx.db.workoutSession.create({
    data: {
      userId: ctx.user.id,
      date: new Date('2026-09-02'),
      startedAt: new Date('2026-09-02T00:00:00Z'),
      lastMutationId: randomUUID(),
      lastMutationHash: 'test-fixture',
    },
  });
  for (const date of ['2026-08-31', '2026-09-04', '2026-10-01'])
    await ctx.request('PUT', `/body/${date}`, { weight: '80' });
  const month = (
    await (await ctx.request('GET', '/calendar?month=2026-09')).json()
  ).data;
  assert.equal(month.days.length, 30);
  assert.equal(month.days[0].date, '2026-09-01');
  assert.equal(month.days[0].workout, true);
  assert.equal(month.days[0].body, false);
  assert.equal(month.days[1].workout, false);
  assert.equal(month.days[1].inProgress, true);
  assert.equal(month.days[3].body, true);
  assert.equal(month.days.at(-1).date, '2026-09-30');
  const day = (
    await (await ctx.request('GET', '/calendar/day?date=2026-09-01')).json()
  ).data;
  assert.equal(day.cardio.length, 1);
  assert.equal(day.body, null);
  assert.equal(day.nutrition.recorded, false);
  const empty = (
    await (await ctx.request('GET', '/calendar/day?date=2026-09-05')).json()
  ).data;
  assert.equal(empty.workouts.length, 0);
  assert.equal(empty.cardio.length, 0);
  assert.equal(empty.meals.length, 0);
  assert.equal(empty.body, null);
  assert.equal(
    (await (await ctx.request('GET', '/calendar?month=2024-02')).json()).data
      .days.length,
    29,
  );
  assert.equal(
    (await (await ctx.request('GET', '/calendar?month=2023-02')).json()).data
      .days.length,
    28,
  );
  assert.equal(
    (await ctx.request('GET', '/calendar?month=2026-13')).status,
    400,
  );
  const other = await ctx.makeUser();
  const privateMonth = (
    await (
      await ctx.request(
        'GET',
        '/calendar?month=2026-09',
        undefined,
        other.cookie,
      )
    ).json()
  ).data;
  assert.ok(
    privateMonth.days.every(
      (d: { workout: boolean; body: boolean; inProgress: boolean }) =>
        !d.workout && !d.body && !d.inProgress,
    ),
  );
});
