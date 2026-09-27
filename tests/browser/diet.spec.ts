import { test, expect } from '@playwright/test';
import { browserUser, login } from './helpers';
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
});
test.afterAll(async () => {
  await user?.close();
});
test('mobile food creation, serving conversion, meal editing and daily totals', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await login(page, user);
  await page.goto('/diet/new');
  await page.getByLabel('식사 구분', { exact: true }).selectOption('LUNCH');
  await page.getByRole('button', { name: '음식 추가', exact: true }).click();
  await page.getByRole('button', { name: '음식 만들기', exact: true }).click();
  await page.getByLabel('음식 이름', { exact: true }).fill('닭가슴살');
  await page.getByLabel('열량 (kcal)', { exact: true }).fill('165');
  await page.getByLabel('단백질 (g)', { exact: true }).fill('31');
  await page.getByLabel('지방 (g)', { exact: true }).fill('3.6');
  await page
    .getByRole('button', { name: '음식 정보 저장', exact: true })
    .click();
  await expect(page.getByRole('dialog', { name: '음식 선택' })).toBeHidden();
  await page.getByLabel('섭취량 (회)', { exact: true }).fill('2');
  await expect(page.getByText('200 g', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '식단 저장', exact: true }).click();
  await expect(page).toHaveURL(/diet\?date=/);
  await expect(
    page.getByRole('region', { name: '일일 영양 합계' }),
  ).toContainText('330');
  await page.getByRole('link', { name: /닭가슴살/ }).click();
  await page.getByLabel('섭취량 (회)', { exact: true }).fill('3');
  await page.getByRole('button', { name: '식단 저장', exact: true }).click();
  await expect(
    page.getByRole('region', { name: '일일 영양 합계' }),
  ).toContainText('495');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: 'test-results/diet-mobile.png',
    fullPage: true,
  });
});
test('preset preview uses latest nutrition while saved meals preserve snapshots', async ({
  page,
}) => {
  const food = await user.db.food.create({
    data: {
      ownerId: user.id,
      name: '프리셋 두유',
      servingSize: '100',
      servingUnit: 'ML',
      calories: '50',
      protein: '4',
      carbs: '3',
      fat: '2',
    },
  });
  await login(page, user);
  await page.goto('/diet/presets');
  await page
    .getByRole('button', { name: '프리셋 만들기', exact: true })
    .click();
  await page.getByLabel('프리셋 이름', { exact: true }).fill('간편 아침');
  await page
    .getByLabel('기본 식사 구분', { exact: true })
    .selectOption('BREAKFAST');
  await page.getByRole('button', { name: '음식 추가', exact: true }).click();
  await page.getByLabel('음식 검색', { exact: true }).fill('프리셋 두유');
  await page
    .getByRole('button', { name: '프리셋 두유 즐겨찾기 등록', exact: true })
    .click();
  await expect(
    page.getByRole('button', {
      name: '프리셋 두유 즐겨찾기 해제',
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole('dialog', { name: '음식 선택' })
    .getByRole('button', { name: /프리셋 두유 100ml/ })
    .click();
  await page.getByLabel('제공량 배수 (회)', { exact: true }).fill('2');
  await page.getByRole('button', { name: '프리셋 저장', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '간편 아침', exact: true }),
  ).toBeVisible();
  await user.db.food.update({
    where: { id: food.id },
    data: { calories: '60' },
  });
  await page.getByRole('button', { name: '프리셋 적용', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: '식사에 프리셋 추가' }),
  ).toContainText('120 kcal');
  await page.getByRole('button', { name: '식사에 추가', exact: true }).click();
  await expect(page.getByRole('link', { name: /프리셋 두유/ })).toContainText(
    '120 kcal',
  );
  await user.db.food.update({
    where: { id: food.id },
    data: { calories: '100', name: '바뀐 두유' },
  });
  await page.reload();
  await expect(page.getByRole('link', { name: /프리셋 두유/ })).toContainText(
    '120 kcal',
  );
});
