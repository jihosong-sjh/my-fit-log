import {
  test,
  expect,
  chromium,
  type Page,
  type BrowserContext,
} from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { WorkoutDraft } from '../../apps/web/src/lib/draft/model';
import { browserUser, login, pickExercise } from './helpers';
let user: Awaited<ReturnType<typeof browserUser>>;
test.beforeAll(async () => {
  user = await browserUser();
});
test.afterAll(async () => {
  await user?.close();
});
test.setTimeout(60000);
async function localDraft(
  page: Page,
  id: string,
  userId = user.id,
): Promise<WorkoutDraft | null> {
  return page.evaluate(
    ({ key }) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('myfit-workout-drafts', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const request = db
            .transaction('workouts', 'readonly')
            .objectStore('workouts')
            .get(key);
          request.onsuccess = () => {
            resolve(request.result ?? null);
            db.close();
          };
          request.onerror = () => reject(request.error);
        };
      }),
    { key: `${userId}:${id}` },
  );
}
async function working(page: Page) {
  await login(page, user);
  await page.goto('/workout/new');
  await page.getByRole('button', { name: '운동 시작', exact: true }).click();
  await expect(page).toHaveURL(/workout\/[0-9a-f-]{36}/);
  const id = new URL(page.url()).pathname.split('/').at(-1)!;
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  await pickExercise(page, 'Bench Press');
  await page.getByLabel('Bench Press 1세트 중량', { exact: true }).fill('70');
  await page.getByLabel('Bench Press 1세트 횟수', { exact: true }).fill('8');
  await page.getByRole('button', { name: '운동 저장', exact: true }).click();
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  return id;
}
test('completion response loss retries the same mutation without duplicate workout or sets', async ({
  page,
}) => {
  const id = await working(page);
  const bodies: unknown[] = [];
  let lost = false;
  await page.route('**/api/v1/workouts/*', async (route) => {
    if (
      route.request().method() === 'PUT' &&
      route.request().postDataJSON().status === 'COMPLETED'
    ) {
      bodies.push(route.request().postDataJSON());
      if (!lost) {
        lost = true;
        await route.fetch();
        await route.abort('failed');
        return;
      }
    }
    await route.continue();
  });
  await page
    .getByRole('checkbox', { name: 'Bench Press 1세트 완료', exact: true })
    .check();
  await page.getByRole('button', { name: '운동 완료', exact: true }).click();
  await expect(page.getByTestId('draft-status')).toContainText('저장 실패');
  expect((await localDraft(page, id))?.pendingPayload?.status).toBe(
    'COMPLETED',
  );
  const revision = (
    await user.db.workoutSession.findUniqueOrThrow({ where: { id } })
  ).revision;
  await page.getByRole('button', { name: '다시 저장', exact: true }).click();
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  await expect.poll(() => localDraft(page, id)).toBeNull();
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toEqual(bodies[1]);
  expect(
    (await user.db.workoutSession.findUniqueOrThrow({ where: { id } }))
      .revision,
  ).toBe(revision);
  expect(
    await user.db.workoutSet.count({
      where: { workoutExercise: { workoutSessionId: id } },
    }),
  ).toBe(1);
});
test('unsent IndexedDB input survives an actual persistent-browser restart', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'myfit-draft-'));
  let context: BrowserContext | undefined;
  try {
    context = await chromium.launchPersistentContext(directory, {
      headless: true,
      baseURL: process.env.E2E_BASE_URL,
    });
    let page = context.pages()[0] ?? (await context.newPage());
    const id = await working(page);
    const url = page.url();
    await page.route('**/api/v1/workouts/*', (route) =>
      route.request().method() === 'PUT'
        ? route.abort('failed')
        : route.continue(),
    );
    await page.getByLabel('Bench Press 1세트 중량', { exact: true }).fill('75');
    await expect(page.getByTestId('draft-status')).toContainText('저장 실패');
    await expect
      .poll(
        async () =>
          (await localDraft(page, id))?.payload.exercises[0]?.sets[0]?.weight,
      )
      .toBe('75');
    await context.close();
    context = undefined;
    context = await chromium.launchPersistentContext(directory, {
      headless: true,
      baseURL: process.env.E2E_BASE_URL,
    });
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(url);
    await page.getByRole('button', { name: '기록 복구', exact: true }).click();
    await expect(
      page.getByLabel('Bench Press 1세트 중량', { exact: true }),
    ).toHaveValue('75');
    await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
    expect(
      (
        await user.db.workoutSet.findFirstOrThrow({
          where: { workoutExercise: { workoutSessionId: id } },
        })
      ).weight.toString(),
    ).toBe('75');
  } finally {
    await context?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
test('in-flight edits survive acknowledgement and 409/404 keep local input for explicit resolution', async ({
  page,
}) => {
  const id = await working(page);
  let begin!: () => void;
  const began = new Promise<void>((resolve) => {
    begin = resolve;
  });
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let delayed = false;
  await page.route('**/api/v1/workouts/*', async (route) => {
    if (
      route.request().method() === 'PUT' &&
      route.request().postDataJSON().memo === 'first' &&
      !delayed
    ) {
      delayed = true;
      begin();
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    } else await route.continue();
  });
  await page.getByLabel('운동 메모', { exact: true }).fill('first');
  await began;
  await page.getByLabel('운동 메모', { exact: true }).fill('second');
  release();
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  expect(
    (await user.db.workoutSession.findUniqueOrThrow({ where: { id } })).memo,
  ).toBe('second');
  await user.db.workoutSession.update({
    where: { id },
    data: { revision: { increment: 1 }, memo: 'remote' },
  });
  await page.getByLabel('운동 메모', { exact: true }).fill('local');
  await expect(page.getByTestId('draft-status')).toContainText('충돌');
  await expect(page.getByLabel('운동 메모', { exact: true })).toHaveValue(
    'local',
  );
  await page
    .getByRole('button', { name: '서버 기록 비교', exact: true })
    .click();
  await expect(
    page.getByText('서버 메모: remote', { exact: true }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: '기기 입력으로 다시 저장', exact: true })
    .click();
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  expect(
    (await user.db.workoutSession.findUniqueOrThrow({ where: { id } })).memo,
  ).toBe('local');
  await user.db.workoutSession.delete({ where: { id } });
  await page.getByLabel('운동 메모', { exact: true }).fill('preserve deleted');
  await expect(page.getByTestId('draft-status')).toContainText('충돌');
  await expect(
    page.getByRole('alert').filter({ hasText: '서버에서 삭제된 운동' }),
  ).toBeVisible();
  expect((await localDraft(page, id))?.payload.memo).toBe('preserve deleted');
  expect(await user.db.workoutSession.count({ where: { id } })).toBe(0);
});
test('401 preserves draft through re-login and resumes with the same account', async ({
  page,
}) => {
  const id = await working(page);
  await user.db.session.deleteMany({ where: { userId: user.id } });
  await page.getByLabel('운동 메모', { exact: true }).fill('after expiry');
  await expect(
    page.getByRole('alert').filter({ hasText: '로그인이 만료' }),
  ).toBeVisible();
  expect((await localDraft(page, id))?.payload.memo).toBe('after expiry');
  await page.getByRole('link', { name: '다시 로그인', exact: true }).click();
  await page.getByLabel('이메일', { exact: true }).fill(user.email);
  await page.getByLabel('비밀번호', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole('link', { name: '기록 복구', exact: true }).click();
  await expect(page.getByLabel('운동 메모', { exact: true })).toHaveValue(
    'after expiry',
  );
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
});
test('IndexedDB quota failure is visible and unsupported schema is preserved until discarded', async ({
  page,
}) => {
  const id = await working(page);
  let writes = 0;
  page.on('request', (request) => {
    if (
      request.method() === 'PUT' &&
      request.url().includes('/api/v1/workouts/')
    )
      writes++;
  });
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    (window as Window & { restorePut: () => void }).restorePut = () => {
      IDBObjectStore.prototype.put = put;
    };
  });
  await page.getByLabel('Bench Press 1세트 중량', { exact: true }).fill('83');
  await expect(page.getByTestId('draft-status')).toHaveText('기기 저장 실패');
  await page.getByRole('button', { name: '운동 저장', exact: true }).click();
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: '이 기기에 임시 저장하지 못했어요' }),
  ).toBeVisible();
  expect(writes).toBe(0);
  await expect(
    page.getByLabel('Bench Press 1세트 중량', { exact: true }),
  ).toHaveValue('83');
  await page.evaluate(() =>
    (window as Window & { restorePut: () => void }).restorePut(),
  );
  await page
    .getByRole('button', { name: '기기 저장 다시 시도', exact: true })
    .click();
  await expect(page.getByTestId('draft-status')).toHaveText('저장됨');
  await page.evaluate(
    ({ key }) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('myfit-workout-drafts', 1);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('workouts', 'readwrite');
          const store = tx.objectStore('workouts');
          const get = store.get(key);
          get.onsuccess = () =>
            store.put({ ...get.result, schemaVersion: 999 });
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { key: `${user.id}:${id}` },
  );
  await page.reload();
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: '이 버전에서 읽을 수 없는 기기 기록' }),
  ).toBeVisible();
  expect((await localDraft(page, id))?.schemaVersion).toBe(999);
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: '기기 기록 폐기', exact: true })
    .click();
  await expect(page).toHaveURL(/workout$/);
  expect(await user.db.workoutSession.count({ where: { id } })).toBe(1);
});
test('logout warns about unsynced input and clears only the current account drafts', async ({
  page,
}) => {
  const other = await browserUser();
  try {
    const id = await working(page);
    await page.route('**/api/v1/workouts/*', (route) =>
      route.request().method() === 'PUT'
        ? route.abort('failed')
        : route.continue(),
    );
    await page.getByLabel('운동 메모', { exact: true }).fill('unsynced logout');
    await expect(page.getByTestId('draft-status')).toContainText('저장 실패');
    const raw = await localDraft(page, id);
    const otherId = randomUUID();
    await page.evaluate(
      ({ row, key, userId, id }) =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('myfit-workout-drafts', 1);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction('workouts', 'readwrite');
            tx.objectStore('workouts').put({
              ...row,
              key,
              userId,
              workoutId: id,
              payload: {
                ...row!.payload,
                id,
                revision: 0,
                exercises: [],
                memo: 'other account',
              },
              baseRevision: null,
              pendingMutationId: null,
              pendingPayload: null,
              pendingVersion: null,
              localVersion: 0,
              syncState: 'DIRTY',
            });
            tx.oncomplete = () => {
              db.close();
              resolve();
            };
            tx.onerror = () => reject(tx.error);
          };
        }),
      {
        row: raw,
        key: `${other.id}:${otherId}`,
        userId: other.id,
        id: otherId,
      },
    );
    await Promise.all([
      page.waitForEvent('dialog').then((dialog) => dialog.dismiss()),
      page.getByRole('button', { name: '로그아웃', exact: true }).click(),
    ]);
    await expect(page).toHaveURL(new RegExp(id));
    await expect(page.getByLabel('운동 메모', { exact: true })).toHaveValue(
      'unsynced logout',
    );
    await Promise.all([
      page.waitForEvent('dialog').then((dialog) => dialog.accept()),
      page.getByRole('button', { name: '로그아웃', exact: true }).click(),
    ]);
    await expect(page).toHaveURL(/login/);
    expect(await localDraft(page, id)).toBeNull();
    expect(await localDraft(page, otherId, other.id)).not.toBeNull();
    await login(page, other);
    await expect(
      page.getByRole('link', { name: '기록 복구', exact: true }),
    ).toHaveCount(1);
    await expect(
      page.getByText('unsynced logout', { exact: true }),
    ).toHaveCount(0);
  } finally {
    await other.close();
  }
});
