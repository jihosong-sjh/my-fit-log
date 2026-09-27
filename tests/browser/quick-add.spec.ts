import { test, expect, type Page } from '@playwright/test';
import { browserUser, login, pickExercise } from './helpers';
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
  await user.db.food.create({
    data: {
      ownerId: user.id,
      name: 'Quick food',
      servingSize: '1',
      servingUnit: 'SERVING',
      calories: '10',
      protein: '1',
      carbs: '1',
      fat: '0',
    },
  });
});
test.afterAll(async () => {
  await user?.close();
});
async function quick(page: Page, name: string, mobile = false) {
  await (
    mobile
      ? page.getByRole('navigation', { name: '모바일 메뉴' })
      : page.locator('header')
  )
    .getByRole('button', { name: '빠른 기록', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: '빠른 기록' })
    .getByRole('link', { name, exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: '빠른 기록' })).toBeHidden();
}
test('desktop and mobile Quick Add reach all four real save flows', async ({
  page,
}) => {
  await login(page, user);
  await quick(page, '웨이트');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await pickExercise(page, 'Bench Press');
  await page.getByLabel('Bench Press 1세트 중량', { exact: true }).fill('10');
  await page.getByLabel('Bench Press 1세트 횟수', { exact: true }).fill('1');
  await page
    .getByRole('checkbox', { name: 'Bench Press 1세트 완료', exact: true })
    .check();
  await page.getByRole('button', { name: '운동 완료', exact: true }).click();
  await expect(page.getByText('운동을 완료했어요')).toBeVisible();
  await quick(page, '식단');
  await page.getByRole('button', { name: '음식 추가', exact: true }).click();
  await page.getByLabel('음식 검색', { exact: true }).fill('Quick food');
  await page
    .getByRole('dialog', { name: '음식 선택' })
    .getByRole('button', { name: /Quick food 1인분/ })
    .click();
  await page.getByRole('button', { name: '식단 저장', exact: true }).click();
  await expect(page).toHaveURL(/diet\?date=/);
  await page.setViewportSize({ width: 390, height: 844 });
  await quick(page, '체중', true);
  await page.getByLabel('빠른 체중 기록 (kg)', { exact: true }).fill('80');
  await page.getByRole('button', { name: '체중 저장', exact: true }).click();
  await expect(page.getByText('체중을 저장했어요')).toBeVisible();
  await quick(page, '유산소', true);
  await pickExercise(page, '걷기');
  await page.getByLabel('운동 시간 (분)', { exact: true }).fill('1');
  await page.getByRole('button', { name: '유산소 저장', exact: true }).click();
  await expect(page).toHaveURL(/workout\/history/);
  expect(
    await user.db.workoutSession.count({
      where: { userId: user.id, status: 'COMPLETED' },
    }),
  ).toBe(1);
  expect(await user.db.meal.count({ where: { userId: user.id } })).toBe(1);
  expect(await user.db.bodyRecord.count({ where: { userId: user.id } })).toBe(
    1,
  );
  expect(await user.db.cardioRecord.count({ where: { userId: user.id } })).toBe(
    1,
  );
});
