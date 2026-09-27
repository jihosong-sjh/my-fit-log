import { test, expect } from '@playwright/test';
import { browserUser, login } from './helpers';
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
});
test.afterAll(async () => {
  await user?.close();
});
test('body form, quick weight preserves optional fields, responsive chart and history', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, user);
  await page.goto('/body');
  await page.getByLabel('체중 (kg)', { exact: true }).fill('82');
  await page.getByLabel('체지방률 (%) · 선택', { exact: true }).fill('20');
  await page.getByLabel('근육량 (kg) · 선택', { exact: true }).fill('30');
  await page.getByLabel('허리둘레 (cm) · 선택', { exact: true }).fill('85');
  await page.getByLabel('메모', { exact: true }).fill('유지할 메모');
  await page
    .getByRole('button', { name: '신체 기록 저장', exact: true })
    .click();
  await expect(page.getByText('신체 기록을 저장했어요')).toBeVisible();
  await page.goto('/dashboard');
  await page.getByLabel('빠른 체중 기록 (kg)', { exact: true }).fill('81.5');
  await page.getByRole('button', { name: '체중 저장', exact: true }).click();
  await expect(page.getByText('체중을 저장했어요')).toBeVisible();
  await page.goto('/body');
  await expect(page.getByLabel('체중 (kg)', { exact: true })).toHaveValue(
    '81.5',
  );
  await expect(
    page.getByLabel('체지방률 (%) · 선택', { exact: true }),
  ).toHaveValue('20');
  await expect(page.getByLabel('메모', { exact: true })).toHaveValue(
    '유지할 메모',
  );
  await page.getByRole('button', { name: '7D', exact: true }).click();
  await expect(
    page.getByRole('figure', { name: '체중과 7일 평균', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: 'test-results/body-mobile.png',
    fullPage: true,
  });
});
