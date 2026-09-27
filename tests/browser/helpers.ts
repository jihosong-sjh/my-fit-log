import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { expect, type Page } from '@playwright/test';
const require = createRequire(`${process.cwd()}/apps/api/package.json`);
export const { createDatabase } =
  require('@myfit/database') as typeof import('../../prisma/src');
const { manageAccount } =
  require('./dist/auth/accounts.js') as typeof import('../../apps/api/src/auth/accounts');
export async function browserUser() {
  if (new URL(process.env.DATABASE_URL!).pathname !== '/myfit_test')
    throw new Error('Test DB required');
  const db = createDatabase(process.env.DATABASE_URL!);
  const email = `${randomUUID()}@test.invalid`;
  const password = 'Browser-fixture-password-123';
  const { id } = await manageAccount(
    db,
    'create',
    email,
    '운동 테스트',
    password,
  );
  return {
    db,
    id,
    email,
    password,
    async close() {
      const where = { userId: id };
      await db.workoutSession.deleteMany({ where });
      await db.workoutRoutine.deleteMany({ where });
      await db.cardioRecord.deleteMany({ where });
      await db.meal.deleteMany({ where });
      await db.mealPreset.deleteMany({ where });
      await db.bodyRecord.deleteMany({ where });
      await db.exerciseFavorite.deleteMany({ where });
      await db.foodFavorite.deleteMany({ where });
      await db.exercise.deleteMany({ where: { ownerId: id } });
      await db.food.deleteMany({ where: { ownerId: id } });
      await db.user.delete({ where: { id } });
      await db.$disconnect();
    },
  };
}
export async function login(
  page: Page,
  user: { email: string; password: string },
) {
  await page.goto('/login');
  await page.getByLabel('이메일', { exact: true }).fill(user.email);
  await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
}
export async function pickExercise(page: Page, name: string) {
  await page.getByRole('button', { name: '종목 선택', exact: true }).click();
  await page.getByLabel('종목 검색', { exact: true }).fill(name);
  await page
    .getByRole('dialog', { name: '운동 종목 선택' })
    .getByRole('button', { name, exact: true })
    .click();
  await expect(
    page.getByRole('dialog', { name: '운동 종목 선택' }),
  ).toBeHidden();
}
