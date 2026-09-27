import { test, expect } from '@playwright/test';
for (const width of [375, 390, 430, 768, 1024, 1440]) {
  test(`layout and theme at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/design-system');
    await expect(
      page.getByRole('heading', { name: '컴포넌트 가이드', exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await expect(
      page.getByRole('navigation', {
        name: width < 768 ? '모바일 메뉴' : '주 메뉴',
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: '테마 변경' }).click();
    await page
      .getByRole('menuitemradio', { name: '다크', exact: true })
      .click();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/design-${width}-dark.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: '테마 변경' }).click();
    await page
      .getByRole('menuitemradio', { name: '라이트', exact: true })
      .click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await page.screenshot({
      path: `test-results/design-${width}-light.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
test('input, search, tabs, dialog focus trap, sheet and toast', async ({
  page,
}) => {
  await page.goto('/design-system');
  expect(
    await page
      .getByRole('button', { name: '예제 확인', exact: true })
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(44);
  await page.getByLabel('중량 (kg)', { exact: true }).fill('82.5');
  await page.getByLabel('횟수', { exact: true }).fill('8');
  await page.getByRole('button', { name: '예제 확인', exact: true }).click();
  await expect(page.getByText('예제 입력 확인: 82.5 kg × 8회')).toBeVisible();
  await page.getByLabel('운동 검색', { exact: true }).fill('Squat');
  await expect(page.getByRole('list', { name: '검색 결과' })).toHaveText(
    'Squat',
  );
  await page.getByRole('tab', { name: '웨이트', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(
    page.getByRole('tab', { name: '유산소', exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  const trigger = page.getByRole('button', { name: '다이얼로그 열기' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: '운동 기록 확인' });
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(
      await dialog.evaluate((el) => el.contains(document.activeElement)),
    ).toBeTruthy();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: '시트 열기' }).click();
  await expect(
    page.getByRole('dialog', { name: '식단 빠른 입력' }),
  ).toBeVisible();
  await page.getByLabel('식단 메모').fill('닭가슴살');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '시트 열기' })).toBeFocused();
});
test('mobile navigation, quick add and system theme', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page
    .getByRole('button', { name: '빠른 기록', exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole('dialog', { name: '빠른 기록' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page
    .getByRole('navigation', { name: '모바일 메뉴' })
    .getByRole('link', { name: '운동', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: '운동', exact: true }),
  ).toBeVisible();
});
