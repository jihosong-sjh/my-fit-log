import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { testContext } from './helpers';
let ctx: Awaited<ReturnType<typeof testContext>>;
const foodInput = {
  name: 'Chicken',
  servingSize: '100',
  servingUnit: 'G',
  calories: '165',
  protein: '31',
  carbs: '0',
  fat: '3.6',
};
async function createFood() {
  const response = await ctx.request('POST', '/foods', foodInput);
  assert.equal(response.status, 201);
  return (await response.json()).data;
}
before(async () => {
  ctx = await testContext();
});
after(async () => {
  await ctx?.close();
});
test('food validation, favorites, frequency and private catalog isolation', async () => {
  for (const value of [
    { ...foodInput, calories: '-1' },
    { ...foodInput, servingSize: '0' },
    { ...foodInput, calories: 165 },
  ])
    assert.equal((await ctx.request('POST', '/foods', value)).status, 400);
  const food = await createFood();
  await ctx.request('POST', `/foods/${food.id}/favorite`);
  assert.equal(
    (await (await ctx.request('GET', '/foods?favorite=true')).json()).data
      .length,
    1,
  );
  const other = await ctx.makeUser();
  assert.equal(
    (await (await ctx.request('GET', '/foods', undefined, other.cookie)).json())
      .data.length,
    0,
  );
  assert.equal(
    (
      await ctx.request(
        'POST',
        `/foods/${food.id}/favorite`,
        undefined,
        other.cookie,
      )
    ).status,
    404,
  );
  const input = {
    date: '2026-09-27',
    mealType: 'LUNCH',
    foods: [{ id: randomUUID(), foodId: food.id, servings: '2' }],
  };
  assert.equal(
    (await ctx.request('POST', '/meals', input, other.cookie)).status,
    404,
  );
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await ctx.request('POST', '/meals', {
          ...input,
          foods: [{ ...input.foods[0], id: randomUUID() }],
        })
      ).status,
      201,
    );
  const row = (await (await ctx.request('GET', '/foods?sort=frequent')).json())
    .data[0];
  assert.equal(row.id, food.id);
  assert.equal(row.usageCount, 2);
  assert.equal(row.lastUsed, '2026-09-27');
});
test('nutrition snapshot and amounts survive catalog changes/archive; last food cannot be removed', async () => {
  const food = await createFood();
  const item = { id: randomUUID(), foodId: food.id, servings: '2' };
  const input = { date: '2026-09-26', mealType: 'DINNER', foods: [item] };
  const response = await ctx.request('POST', '/meals', input);
  assert.equal(response.status, 201);
  const meal = (await response.json()).data;
  assert.equal(meal.totals.calories, '330');
  assert.equal(meal.totals.protein, '62');
  await ctx.request('PUT', `/foods/${food.id}`, {
    ...foodInput,
    name: 'Changed',
    calories: '200',
  });
  await ctx.request('DELETE', `/foods/${food.id}`);
  assert.equal(
    (
      await ctx.request('PUT', `/meals/${meal.id}`, {
        ...input,
        foods: [{ ...item, servings: '3' }],
      })
    ).status,
    200,
  );
  const saved = (await (await ctx.request('GET', `/meals/${meal.id}`)).json())
    .data;
  assert.equal(saved.totals.calories, '495');
  assert.equal(saved.foods[0].foodNameSnapshot, 'Chicken');
  assert.equal(
    (await ctx.request('PUT', `/meals/${meal.id}`, { ...input, foods: [] }))
      .status,
    400,
  );
  assert.equal(
    (
      await ctx.request('PUT', `/meals/${meal.id}`, {
        ...input,
        foods: [{ ...item, caloriesSnapshot: '1' }],
      })
    ).status,
    400,
  );
  const other = await ctx.makeUser();
  assert.equal(
    (await ctx.request('GET', `/meals/${meal.id}`, undefined, other.cookie))
      .status,
    404,
  );
  assert.equal(
    (await ctx.request('DELETE', `/meals/${meal.id}`, undefined, other.cookie))
      .status,
    404,
  );
  await ctx.request('DELETE', `/meals/${meal.id}`);
  assert.equal(await ctx.db.mealFood.count({ where: { mealId: meal.id } }), 0);
});
test('preset uses latest food snapshot, has independent history and rolls back archived references', async () => {
  const first = await createFood();
  const second = await createFood();
  const input = {
    name: 'Lunch preset',
    defaultMealType: 'LUNCH',
    foods: [
      { foodId: first.id, servings: '1' },
      { foodId: second.id, servings: '1' },
    ],
  };
  const created = await ctx.request('POST', '/meal-presets', input);
  assert.equal(created.status, 201);
  const preset = (await created.json()).data;
  await ctx.request('PUT', `/foods/${first.id}`, {
    ...foodInput,
    calories: '200',
  });
  const response = await ctx.request(
    'POST',
    `/meal-presets/${preset.id}/apply`,
    { date: '2026-09-27' },
  );
  assert.equal(response.status, 201);
  const meal = (await response.json()).data;
  assert.equal(meal.totals.calories, '365');
  await ctx.request('DELETE', `/foods/${second.id}`);
  const before = await ctx.db.meal.count({ where: { userId: ctx.user.id } });
  assert.equal(
    (
      await ctx.request('POST', `/meal-presets/${preset.id}/apply`, {
        date: '2026-09-27',
      })
    ).status,
    400,
  );
  assert.equal(
    await ctx.db.meal.count({ where: { userId: ctx.user.id } }),
    before,
  );
  await ctx.request('PUT', `/meal-presets/${preset.id}`, {
    ...input,
    foods: [{ foodId: first.id, servings: '2' }],
  });
  await ctx.request('DELETE', `/meal-presets/${preset.id}`);
  assert.equal(
    (await (await ctx.request('GET', `/meals/${meal.id}`)).json()).data.totals
      .calories,
    '365',
  );
});
