import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { browserUser, login, pickExercise } from './helpers';

let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
});
test.afterAll(async () => {
  await user?.close();
});

for (const theme of ['light', 'dark'] as const) {
  test(`accessible pages and input controls in ${theme} theme`, async ({
    page,
  }) => {
    test.setTimeout(180000);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await login(page, user);
    for (const path of [
      '/dashboard',
      '/workout',
      '/workout/new',
      '/workout/history',
      '/routines',
      '/diet',
      '/diet/new',
      '/diet/presets',
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
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations, `${theme} ${path}`).toEqual([]);
    }
    await page.goto('/workout/new');
    await page.getByRole('button', { name: '운동 시작', exact: true }).click();
    await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
    await pickExercise(page, 'Bench Press');
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.getByRole('button', { name: '종목 선택', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze()
      ).violations,
    ).toEqual([]);
  });
}
