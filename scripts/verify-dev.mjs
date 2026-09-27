import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

async function waitFor(check) {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      if (await check()) return;
    } catch {
      /* dev server may restart */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Timed out waiting for development reload');
}
const webPath = 'apps/web/src/app/page.tsx';
const apiPath = 'apps/api/src/app.module.ts';
const webSource = await readFile(webPath, 'utf8');
const apiSource = await readFile(apiPath, 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  assert.equal(
    (await page.request.get('http://localhost:4000/health/live')).status(),
    200,
  );
  assert.equal(
    (await page.request.get('http://localhost:4000/health/ready')).status(),
    200,
  );
  assert.equal(
    (await page.request.get('http://localhost:3000/api/v1')).status(),
    200,
  );
  await writeFile(
    webPath,
    webSource.replace('</main>', '<p>HMR verification marker</p></main>'),
  );
  await waitFor(() => page.getByText('HMR verification marker').isVisible());
  await writeFile(webPath, webSource);
  await waitFor(
    async () => !(await page.getByText('HMR verification marker').isVisible()),
  );
  await writeFile(
    apiPath,
    apiSource.replace("status: 'ok'", "status: 'reload-verified'"),
  );
  await waitFor(
    async () =>
      (
        await (
          await fetch('http://localhost:4000/health/live', {
            signal: AbortSignal.timeout(2000),
          })
        ).json()
      ).data.status === 'reload-verified',
  );
  console.log(
    'PASS: Web/API/DB readiness, same-origin proxy, browser HMR and Nest watch reload',
  );
} finally {
  await writeFile(webPath, webSource);
  await writeFile(apiPath, apiSource);
  await browser.close();
}
await waitFor(
  async () =>
    (
      await (
        await fetch('http://localhost:4000/health/live', {
          signal: AbortSignal.timeout(2000),
        })
      ).json()
    ).data.status === 'ok',
);
