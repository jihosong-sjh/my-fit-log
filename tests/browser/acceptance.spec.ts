import { test, expect } from '@playwright/test';
import { localDate } from '@myfit/types';
import { browserUser, login, pickExercise } from './helpers';

for (const width of [375, 390, 430, 1440]) {
  test(`core workout, three-food meal, weight and cardio flow at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const user = await browserUser();
    try {
      await user.db.food.createMany({
        data: [
          {
            name: '닭가슴살',
            calories: '165',
            protein: '31',
            carbs: '0',
            fat: '3.6',
          },
          { name: '밥', calories: '300', protein: '5', carbs: '65', fat: '1' },
          { name: '계란', calories: '75', protein: '6', carbs: '1', fat: '5' },
        ].map((food) => ({
          ...food,
          ownerId: user.id,
          servingSize: '100',
          servingUnit: 'G' as const,
        })),
      });
      await page.setViewportSize({ width, height: 900 });
      await login(page, user);
      await page.goto('/workout/new');
      await page
        .getByRole('button', { name: '운동 시작', exact: true })
        .click();
      await pickExercise(page, 'Bench Press');
      await page
        .getByLabel('Bench Press 1세트 중량', { exact: true })
        .fill('80');
      await page
        .getByLabel('Bench Press 1세트 횟수', { exact: true })
        .fill('8');
      await page
        .getByRole('checkbox', { name: 'Bench Press 1세트 완료', exact: true })
        .check();
      await page
        .getByRole('button', { name: '운동 완료', exact: true })
        .click();
      await expect(page.getByText('운동을 완료했어요')).toBeVisible();
      await page.goto('/dashboard');
      await expect(
        page.getByRole('region', { name: '오늘의 운동 요약' }),
      ).toContainText('640');
      await page.goto('/diet/new');
      for (const name of ['닭가슴살', '밥', '계란']) {
        await page
          .getByRole('button', { name: '음식 추가', exact: true })
          .click();
        await page.getByLabel('음식 검색', { exact: true }).fill(name);
        await page
          .getByRole('dialog', { name: '음식 선택' })
          .getByRole('button', { name: new RegExp(`${name} 100g`) })
          .click();
      }
      await page
        .getByRole('button', { name: '식단 저장', exact: true })
        .click();
      await expect(
        page.getByRole('region', { name: '일일 영양 합계' }),
      ).toContainText('540');
      await page.goto('/dashboard');
      await page
        .getByLabel('빠른 체중 기록 (kg)', { exact: true })
        .fill('82.4');
      await page
        .getByRole('button', { name: '체중 저장', exact: true })
        .click();
      await expect(page.getByText('체중을 저장했어요')).toBeVisible();
      await page.goto('/body');
      await expect(page.getByLabel('체중 (kg)', { exact: true })).toHaveValue(
        '82.4',
      );
      await page
        .getByText('체중과 7일 평균 표로 보기', { exact: true })
        .click();
      await expect(page.getByRole('table')).toContainText('82.4');
      for (const [name, minutes] of [
        ['러닝', '30'],
        ['줄넘기', '10'],
      ]) {
        await page.goto('/workout/cardio/new');
        await pickExercise(page, name!);
        await page.getByLabel('운동 시간 (분)', { exact: true }).fill(minutes!);
        await page
          .getByLabel(name === '러닝' ? '거리 (km, 선택)' : '횟수 (선택)', {
            exact: true,
          })
          .fill(name === '러닝' ? '5' : '1000');
        await page
          .getByRole('button', { name: '유산소 저장', exact: true })
          .click();
        await expect(
          page.getByRole('link', { name: new RegExp(name!) }),
        ).toContainText(name === '러닝' ? '6:00 /km' : '1000회');
      }
      await page.goto('/calendar');
      await page
        .getByRole('button', {
          name: `${localDate(new Date())} 운동 식단 신체`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole('link', { name: /러닝 · 30분/ }),
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: /줄넘기 · 10분/ }),
      ).toBeVisible();
      await page.getByRole('link', { name: /줄넘기 · 10분/ }).click();
      await page.getByLabel('횟수 (선택)', { exact: true }).fill('1200');
      await page
        .getByRole('button', { name: '유산소 저장', exact: true })
        .click();
      await expect(page.getByRole('link', { name: /줄넘기/ })).toContainText(
        '1200회',
      );
      await page.getByRole('link', { name: /줄넘기/ }).click();
      page.once('dialog', (dialog) => dialog.accept());
      await page
        .getByRole('button', { name: '유산소 삭제', exact: true })
        .click();
      await expect(page).toHaveURL(/workout\/history/);
      await expect(page.getByRole('link', { name: /줄넘기/ })).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    } finally {
      await user.close();
    }
  });
}

for (const width of [390, 1440]) {
  test(`all main navigation links work at ${width}px`, async ({ page }) => {
    const user = await browserUser();
    try {
      await page.setViewportSize({ width, height: 900 });
      await login(page, user);
      for (const [name, path] of [
        ['운동', '/workout'],
        ['식단', '/diet'],
        ['신체', '/body'],
        ['분석', '/analytics'],
        ['캘린더', '/calendar'],
        ['설정', '/settings'],
        ['오늘', '/dashboard'],
      ]) {
        if (width < 768) {
          await page
            .getByRole('button', { name: '전체 메뉴', exact: true })
            .click();
          await page.getByRole('menuitem', { name, exact: true }).click();
        } else
          await page
            .locator('aside')
            .getByRole('link', { name, exact: true })
            .click();
        await expect(page).toHaveURL(new RegExp(`${path}$`));
        await expect(page.locator('#main-content h1')).toBeVisible();
      }
      await page.goto('/workout');
      await page
        .getByRole('link', { name: '전체 운동 이력', exact: true })
        .click();
      await expect(page).toHaveURL(/workout\/history/);
      await page.getByRole('link', { name: '루틴 관리', exact: true }).click();
      await expect(page).toHaveURL(/routines/);
    } finally {
      await user.close();
    }
  });
}
