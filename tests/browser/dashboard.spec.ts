import { test, expect } from '@playwright/test';
import { browserUser, login } from './helpers';
import { createRequire } from 'node:module';
const require = createRequire(`${process.cwd()}/apps/api/package.json`);
const { localDate, parseDate } =
  require('@myfit/types') as typeof import('../../packages/types/src');
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
  const food = await user.db.food.create({
    data: {
      ownerId: user.id,
      name: 'Dashboard meal',
      servingSize: '1',
      servingUnit: 'SERVING',
      calories: '100',
      protein: '10',
      carbs: '5',
      fat: '2',
    },
  });
  await user.db.meal.create({
    data: {
      userId: user.id,
      date: parseDate(localDate(new Date())),
      mealType: 'LUNCH',
      foods: {
        create: {
          foodId: food.id,
          order: 0,
          foodNameSnapshot: food.name,
          servingSizeSnapshot: '1',
          servingUnitSnapshot: 'SERVING',
          caloriesSnapshot: '100',
          proteinSnapshot: '10',
          carbsSnapshot: '5',
          fatSnapshot: '2',
          servings: '1',
        },
      },
    },
  });
});
test.afterAll(async () => {
  await user?.close();
});
test('dashboard single data endpoint and settings invalidation refresh goal progress', async ({
  page,
}) => {
  await login(page, user);
  const requests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/') && req.method() === 'GET')
      requests.push(new URL(req.url()).pathname);
  });
  await page.reload();
  await expect(page.getByRole('region', { name: '오늘의 요약' })).toContainText(
    '100',
  );
  expect([...new Set(requests)]).toEqual(['/api/v1/dashboard']);
  await page.getByRole('link', { name: '목표 설정', exact: true }).click();
  await page.getByLabel('일일 열량 (kcal)', { exact: true }).fill('200');
  await page.getByRole('button', { name: '설정 저장', exact: true }).click();
  await expect(page.getByText('설정을 저장했어요')).toBeVisible();
  await page
    .getByRole('navigation', { name: '주 메뉴', exact: true })
    .getByRole('link', { name: '오늘', exact: true })
    .click();
  await expect(
    page.getByRole('progressbar', { name: '열량 목표 진행률', exact: true }),
  ).toHaveAttribute('aria-valuenow', '50');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: 'test-results/dashboard-mobile.png',
    fullPage: true,
  });
});
