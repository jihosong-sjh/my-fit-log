import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { browserUser, login } from './helpers';
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
  const date = new Date('2026-09-01T00:00:00Z');
  const exercise = await user.db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'cardio-running' },
  });
  await user.db.cardioRecord.create({
    data: {
      userId: user.id,
      date,
      exerciseId: exercise.id,
      exerciseNameSnapshot: 'ignored',
      durationSeconds: 600,
      distanceKm: '2',
    },
  });
  await user.db.workoutSession.create({
    data: {
      userId: user.id,
      date,
      startedAt: date,
      lastMutationId: randomUUID(),
      lastMutationHash: 'fixture',
    },
  });
  await user.db.bodyRecord.create({
    data: { userId: user.id, date, weight: '80' },
  });
  const food = await user.db.food.create({
    data: {
      ownerId: user.id,
      name: 'Calendar food',
      servingSize: '1',
      servingUnit: 'SERVING',
      calories: '100',
      protein: '10',
      carbs: '0',
      fat: '0',
    },
  });
  await user.db.meal.create({
    data: {
      userId: user.id,
      date,
      mealType: 'LUNCH',
      foods: {
        create: {
          foodId: food.id,
          foodNameSnapshot: food.name,
          servingSizeSnapshot: '1',
          servingUnitSnapshot: 'SERVING',
          caloriesSnapshot: '100',
          proteinSnapshot: '10',
          carbsSnapshot: '0',
          fatSnapshot: '0',
          servings: '1',
          order: 0,
        },
      },
    },
  });
});
test.afterAll(async () => {
  await user?.close();
});
test('mobile calendar indicators, exact-day summaries, empty day and dated navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, user);
  await page.goto('/calendar');
  await page.getByLabel('조회 월', { exact: true }).fill('2026-09');
  await page
    .getByRole('button', {
      name: '2026-09-01 운동 식단 신체 작성 중',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('link', { name: /웨이트 작성 중/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /러닝 · 10분/ })).toBeVisible();
  await expect(
    page.getByRole('link', { name: '체중 80kg', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: 'test-results/calendar-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: '2026-09-02', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '이날은 기록이 없어요', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: '신체 기록', exact: true }).click();
  await expect(page.getByLabel('측정일', { exact: true })).toHaveValue(
    '2026-09-02',
  );
  await page.goto('/calendar');
  await page.getByLabel('조회 월', { exact: true }).fill('2026-09');
  await page.getByRole('button', { name: '다음 달', exact: true }).click();
  await expect(page.getByLabel('조회 월', { exact: true })).toHaveValue(
    '2026-10',
  );
  await page.getByRole('button', { name: '2026-10-01', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '이날은 기록이 없어요', exact: true }),
  ).toBeVisible();
});
