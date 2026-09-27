import { test, expect } from '@playwright/test';
import { browserUser, login, pickExercise } from './helpers';
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
});
test.afterAll(async () => {
  await user?.close();
});
test('mobile workout 80kg x 8, set copy/remove, completion and dashboard persistence', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, user);
  await page.goto('/workout/new');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await expect(page).toHaveURL(/workout\/[0-9a-f-]{36}/);
  const url = page.url();
  await pickExercise(page, 'Bench Press');
  await page.getByLabel('Bench Press 1세트 중량', { exact: true }).fill('80');
  await page.getByLabel('Bench Press 1세트 횟수', { exact: true }).fill('8');
  await page
    .getByRole('button', { name: 'Bench Press 1세트 복사', exact: true })
    .click();
  await expect(
    page.getByLabel('Bench Press 2세트 중량', { exact: true }),
  ).toHaveValue('80');
  await page
    .getByRole('button', { name: 'Bench Press 2세트 삭제', exact: true })
    .click();
  await page
    .getByRole('checkbox', { name: 'Bench Press 1세트 완료', exact: true })
    .check();
  await page.getByRole('button', { name: '운동 완료', exact: true }).click();
  await expect(page.getByText('운동을 완료했어요')).toBeVisible();
  await expect(page.getByText('완료한 운동', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: 'test-results/workout-mobile.png',
    fullPage: true,
  });
  await page.goto('/dashboard');
  await expect(
    page.getByRole('region', { name: '오늘의 운동 요약' }),
  ).toContainText('640');
  await page.reload();
  await expect(
    page.getByRole('region', { name: '오늘의 운동 요약' }),
  ).toContainText('640');
  await page.goto(url);
  await expect(
    page.getByLabel('Bench Press 1세트 중량', { exact: true }),
  ).toHaveValue('80');
  await expect(page.getByText(/지난 기록: 80 kg × 8/)).toBeVisible();
});
test('routine creation and copy remain independent from later edits', async ({
  page,
}) => {
  await login(page, user);
  await page.goto('/routines');
  await page.getByRole('button', { name: '루틴 만들기', exact: true }).click();
  await page.getByLabel('루틴 이름', { exact: true }).fill('하체 루틴');
  await pickExercise(page, 'Squat');
  await page.getByRole('button', { name: '루틴 저장', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: '하체 루틴', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('link', { name: '루틴으로 운동 시작', exact: true })
    .click();
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await expect(page).toHaveURL(/workout\/[0-9a-f-]{36}/);
  const url = page.url();
  await expect(
    page.getByLabel('Squat 3세트 횟수', { exact: true }),
  ).toHaveValue('8');
  await page.goto('/routines');
  await page.getByRole('button', { name: '루틴 편집', exact: true }).click();
  await page.getByLabel('기본 세트', { exact: true }).fill('1');
  await page.getByRole('button', { name: '루틴 저장', exact: true }).click();
  await expect(page.getByText('루틴을 저장했어요')).toBeVisible();
  await page.goto(url);
  await expect(
    page.getByLabel('Squat 3세트 횟수', { exact: true }),
  ).toHaveValue('8');
});
test('jump rope uses repetitions and running computes pace, with history editing', async ({
  page,
}) => {
  await login(page, user);
  await page.goto('/workout/cardio/new');
  await pickExercise(page, '줄넘기');
  await page.getByLabel('운동 시간 (분)', { exact: true }).fill('5');
  await page.getByLabel('횟수 (선택)', { exact: true }).fill('500');
  await expect(page.getByLabel('거리 (km, 선택)', { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: '유산소 저장', exact: true }).click();
  await expect(page).toHaveURL(/workout\/history/);
  await expect(page.getByRole('link', { name: /줄넘기/ })).toContainText(
    '500회',
  );
  await page.getByRole('link', { name: /줄넘기/ }).click();
  await page.getByLabel('횟수 (선택)', { exact: true }).fill('600');
  await page.getByRole('button', { name: '유산소 저장', exact: true }).click();
  await expect(page.getByRole('link', { name: /줄넘기/ })).toContainText(
    '600회',
  );
  await page.goto('/workout/cardio/new');
  await pickExercise(page, '러닝');
  await page.getByLabel('운동 시간 (분)', { exact: true }).fill('25');
  await page.getByLabel('거리 (km, 선택)', { exact: true }).fill('5');
  await page.getByRole('button', { name: '유산소 저장', exact: true }).click();
  await expect(page.getByRole('link', { name: /러닝/ })).toContainText(
    '5:00 /km',
  );
});
