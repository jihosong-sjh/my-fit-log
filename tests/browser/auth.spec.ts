import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(`${process.cwd()}/apps/api/package.json`);
const { createDatabase } =
  require('@myfit/database') as typeof import('../../prisma/src');
const { manageAccount } =
  require('./dist/auth/accounts.js') as typeof import('../../apps/api/src/auth/accounts');
if (new URL(process.env.DATABASE_URL!).pathname !== '/myfit_test')
  throw new Error('Isolated test DB required');
const db = createDatabase(process.env.DATABASE_URL!);
const email = `${randomUUID()}@test.invalid`;
const password = 'Browser-test-password-123';
test.beforeAll(async () => {
  await manageAccount(db, 'create', email, '브라우저 테스트', password);
});
test.afterAll(async () => {
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
});
test('unauthorized redirect, login failure, refresh persistence and logout', async ({
  page,
  context,
}) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('이메일', { exact: true }).fill(email);
  await page.getByLabel('비밀번호', { exact: true }).fill('wrong-password-123');
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: '이메일 또는 비밀번호' }),
  ).toContainText('이메일 또는 비밀번호');
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveValue(
    'wrong-password-123',
  );
  await page.getByLabel('비밀번호', { exact: true }).fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByRole('heading', { name: '오늘의 기록' }),
  ).toBeVisible();
  const cookie = (await context.cookies()).find(
    (c) => c.name === 'myfit_session',
  );
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  expect(cookie?.secure).toBe(false);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '오늘의 기록' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '로그아웃', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
});
