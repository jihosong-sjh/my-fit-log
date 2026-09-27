import { test, expect } from '@playwright/test';
import { browserUser, login, pickExercise } from './helpers';
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
});
test.afterAll(async () => {
  await user?.close();
});
test('keyboard Enter advances set inputs, Cmd/Ctrl+Enter saves and Escape protects modal edits', async ({
  page,
}) => {
  await login(page, user);
  await page.goto('/workout/new');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  await pickExercise(page, 'Bench Press');
  const weight = page.getByLabel('Bench Press 1세트 중량', { exact: true });
  await expect(weight).toBeFocused();
  await weight.fill('80');
  await page.keyboard.press('Enter');
  await expect(
    page.getByLabel('Bench Press 1세트 횟수', { exact: true }),
  ).toBeFocused();
  await page.keyboard.type('8');
  await page.keyboard.press('Enter');
  await expect(
    page.getByLabel('Bench Press 1세트 RPE', { exact: true }),
  ).toBeFocused();
  await page.keyboard.type('7.5');
  await page.keyboard.press('Control+Enter');
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('checkbox', { name: 'Bench Press 1세트 완료', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Space');
  await page.keyboard.press('Meta+Enter');
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  await page.goto('/routines');
  await page.getByRole('button', { name: '루틴 만들기', exact: true }).click();
  await page.getByLabel('루틴 이름', { exact: true }).fill('키보드 루틴');
  await Promise.all([
    page.waitForEvent('dialog').then((dialog) => dialog.dismiss()),
    page.keyboard.press('Escape'),
  ]);
  await expect(
    page.getByRole('dialog', { name: '루틴 만들기', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('루틴 이름', { exact: true })).toHaveValue(
    '키보드 루틴',
  );
  await page.getByLabel('루틴 이름', { exact: true }).focus();
  await page.keyboard.press('Control+Enter');
  await expect(
    page.getByRole('dialog', { name: '루틴 만들기', exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole('heading', { name: '키보드 루틴', exact: true }),
  ).toBeVisible();
});
test('save failure preserves fields, retry works and navigation warns before losing edits', async ({
  page,
}) => {
  await login(page, user);
  await page.goto('/body');
  await page.getByLabel('체중 (kg)', { exact: true }).fill('83.25');
  let fail = true;
  await page.route('**/api/v1/body/*', async (route) => {
    if (route.request().method() === 'PUT' && fail) {
      fail = false;
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Service unavailable',
          },
        }),
      });
    } else await route.continue();
  });
  await page
    .getByRole('button', { name: '신체 기록 저장', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: '다시 저장', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('체중 (kg)', { exact: true })).toHaveValue(
    '83.25',
  );
  await page.getByRole('button', { name: '다시 저장', exact: true }).click();
  await expect(page.getByText('신체 기록을 저장했어요')).toBeVisible();
  await page
    .getByLabel('메모', { exact: true })
    .fill('아직 저장하지 않은 메모');
  await Promise.all([
    page.waitForEvent('dialog').then((dialog) => dialog.dismiss()),
    page
      .getByRole('navigation', { name: '주 메뉴', exact: true })
      .getByRole('link', { name: '식단', exact: true })
      .click(),
  ]);
  await expect(page).toHaveURL(/body/);
  await expect(page.getByLabel('메모', { exact: true })).toHaveValue(
    '아직 저장하지 않은 메모',
  );
  await page
    .getByRole('button', { name: '신체 기록 저장', exact: true })
    .click();
  await expect(page.locator('form[data-dirty="true"]')).toHaveCount(0);
  await page.goto('/dashboard');
  await page.getByLabel('빠른 체중 기록 (kg)', { exact: true }).fill('83');
  await page.keyboard.press('Enter');
  await expect(page.getByText('체중을 저장했어요')).toBeVisible();
});
test('major screens fit six widths, preserve keyboard focus and respect reduced motion', async ({
  page,
}) => {
  test.setTimeout(90000);
  await login(page, user);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      '/dashboard',
      '/workout',
      '/diet',
      '/body',
      '/analytics',
      '/calendar',
      '/settings',
    ]) {
      await page.goto(path);
      await expect(page.locator('#main-content h1')).toBeVisible();
      await expect(
        page.getByRole('status', { name: '불러오는 중', exact: true }),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${path} at ${width}`,
      ).toBeTruthy();
    }
    await page.screenshot({ path: `test-results/ux-${width}.png` });
  }
  await page.goto('/dashboard');
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('link', { name: '본문으로 이동', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  expect(
    await page.evaluate(
      () =>
        document.activeElement?.id === 'main-content' ||
        document.activeElement?.closest('main') !== null,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
