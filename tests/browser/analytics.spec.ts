import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { browserUser, login } from './helpers';
const require = createRequire(`${process.cwd()}/apps/api/package.json`);
const { localDate, parseDate } =
  require('@myfit/types') as typeof import('../../packages/types/src');
let user: Awaited<ReturnType<typeof browserUser>>;
let ropeId: string;
test.beforeAll(async () => {
  user = await browserUser();
  const date = parseDate(localDate(new Date()));
  await user.db.bodyRecord.create({
    data: { userId: user.id, date, weight: '80' },
  });
  const rope = await user.db.exercise.findUniqueOrThrow({
    where: { catalogKey: 'cardio-jump-rope' },
  });
  ropeId = rope.id;
  await user.db.cardioRecord.create({
    data: {
      userId: user.id,
      date,
      exerciseId: rope.id,
      exerciseNameSnapshot: 'ignored',
      durationSeconds: 60,
      repetitions: 120,
    },
  });
  const food = await user.db.food.create({
    data: {
      ownerId: user.id,
      name: 'Analytics food',
      servingSize: '100',
      servingUnit: 'G',
      calories: '80',
      protein: '8',
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
          servingSizeSnapshot: '100',
          servingUnitSnapshot: 'G',
          caloriesSnapshot: '80',
          proteinSnapshot: '8',
          carbsSnapshot: '0',
          fatSnapshot: '0',
          order: 0,
          servings: '1',
        },
      },
    },
  });
});
test.afterAll(async () => {
  await user?.close();
});
test('analytics mobile charts, repetition mode and settings invalidate current-goal ratio', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page, user);
  await page.goto('/analytics');
  await expect(
    page.getByRole('figure', { name: '체중 추세', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '웨이트', exact: true }).click();
  await expect(
    page.getByRole('figure', { name: '주간 운동 횟수', exact: true }),
  ).toBeVisible();
  await page.getByRole('tab', { name: '영양', exact: true }).click();
  await page.getByRole('link', { name: '목표 설정', exact: true }).click();
  await page.getByLabel('일일 열량 (kcal)', { exact: true }).fill('200');
  await page.getByRole('button', { name: '설정 저장', exact: true }).click();
  await expect(page.getByText('설정을 저장했어요')).toBeVisible();
  await page
    .getByRole('navigation', { name: '주 메뉴', exact: true })
    .getByRole('link', { name: '분석', exact: true })
    .click();
  await page.getByRole('tab', { name: '영양', exact: true }).click();
  await expect(
    page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText('열량 목표 달성률', { exact: true }) }),
  ).toContainText('40');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: '유산소', exact: true }).click();
  await page.getByLabel('유산소 종목', { exact: true }).selectOption(ropeId);
  await expect(
    page.getByRole('figure', { name: '줄넘기 횟수', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('평균 pace', { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/analytics-mobile.png' });
});
