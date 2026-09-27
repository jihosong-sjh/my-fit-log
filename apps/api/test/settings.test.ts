import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { testContext } from './helpers';
let ctx: Awaited<ReturnType<typeof testContext>>;
before(async () => {
  ctx = await testContext();
});
after(async () => {
  await ctx?.close();
});
test('nullable defaults, persistent partial settings and owner isolation', async () => {
  const initial = await (await ctx.request('GET', '/settings')).json();
  assert.equal(initial.data.goal.dailyCalories, null);
  assert.equal(initial.data.preference.theme, 'SYSTEM');
  const saved = await ctx.request('PATCH', '/settings', {
    name: 'Updated',
    dailyCalories: '2200',
    proteinGoal: '160',
    weeklyWorkoutGoal: 4,
    theme: 'DARK',
  });
  assert.equal(saved.status, 200);
  const data = (await saved.json()).data;
  assert.equal(data.goal.dailyCalories, '2200');
  assert.equal(data.goal.targetWeight, null);
  assert.equal(data.profile.name, 'Updated');
  await ctx.request('PATCH', '/settings', { dailyCalories: null });
  const current = (await (await ctx.request('GET', '/settings')).json()).data;
  assert.equal(current.goal.dailyCalories, null);
  assert.equal(current.goal.proteinGoal, '160');
  assert.equal(current.preference.theme, 'DARK');
  const other = await ctx.makeUser();
  assert.equal(
    (
      await (
        await ctx.request('GET', '/settings', undefined, other.cookie)
      ).json()
    ).data.goal.proteinGoal,
    null,
  );
  for (const invalid of [
    { weeklyWorkoutGoal: 8 },
    { weeklyWorkoutGoal: 0 },
    { weeklyWorkoutGoal: 1.5 },
    { proteinGoal: '0' },
    { targetWeight: 80 },
    { name: null },
    { name: ' ' },
    { theme: null },
    { userId: other.id },
  ])
    assert.equal(
      (await ctx.request('PATCH', '/settings', invalid)).status,
      400,
    );
});
