import { test, expect } from '@playwright/test';
import { cpus, totalmem, platform, arch } from 'node:os';
import { writeFileSync } from 'node:fs';
import { addDays, localDate } from '@myfit/types';
import { browserUser, login } from './helpers';

test('production LCP, input-to-paint, request-to-response and loaded bundle budget', async ({
  browser,
}) => {
  test.skip(
    process.env.E2E_PRODUCTION !== '1',
    'Requires pnpm test:performance production build',
  );
  test.setTimeout(120000);
  const user = await browserUser();
  const context = await browser.newContext();
  try {
    const today = localDate(new Date());
    await user.db.bodyRecord.createMany({
      data: Array.from({ length: 365 }, (_, index) => ({
        userId: user.id,
        date: new Date(`${addDays(today, -index)}T00:00:00Z`),
        weight: String(82 + index / 100),
      })),
    });
    const setup = await context.newPage();
    await login(setup, user);
    await setup.close();
    const samples: {
      lcpMs: number;
      inputMs: number;
      saveMs: number;
      jsTransferBytes: number;
      jsDecodedBytes: number;
    }[] = [];
    for (let index = 0; index < 7; index++) {
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
      await page.addInitScript(() => {
        const state = { lcp: 0, input: 0 };
        Object.assign(window, { myfitPerformance: state });
        new PerformanceObserver((list) => {
          state.lcp = list.getEntries().at(-1)?.startTime ?? 0;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        document.addEventListener('keydown', (event) => {
          if ((event.target as HTMLElement).id === 'quick-weight')
            requestAnimationFrame(() =>
              requestAnimationFrame(() => {
                state.input = performance.now() - event.timeStamp;
              }),
            );
        });
      });
      await page.goto('/dashboard');
      const weight = page.getByLabel('빠른 체중 기록 (kg)', { exact: true });
      await expect(weight).toBeVisible();
      await page.waitForLoadState('networkidle');
      const load = await page.evaluate(() => {
        const js = performance
          .getEntriesByType('resource')
          .filter(
            (r) => r.name.includes('/_next/') && r.name.endsWith('.js'),
          ) as PerformanceResourceTiming[];
        return {
          lcpMs: (window as unknown as { myfitPerformance: { lcp: number } })
            .myfitPerformance.lcp,
          jsTransferBytes: js.reduce((n, r) => n + r.transferSize, 0),
          jsDecodedBytes: js.reduce((n, r) => n + r.decodedBodySize, 0),
        };
      });
      await weight.fill('82.');
      await weight.press('4');
      await expect(weight).toHaveValue('82.4');
      await page.waitForFunction(
        () =>
          (window as unknown as { myfitPerformance: { input: number } })
            .myfitPerformance.input > 0,
      );
      const response = page.waitForResponse(
        (r) =>
          r.url().includes('/api/v1/body/') && r.request().method() === 'PUT',
      );
      await page
        .getByRole('button', { name: '체중 저장', exact: true })
        .click();
      const saved = await response;
      expect(saved.ok()).toBe(true);
      await saved.finished();
      const timing = saved.request().timing();
      const inputMs = await page.evaluate(
        () =>
          (window as unknown as { myfitPerformance: { input: number } })
            .myfitPerformance.input,
      );
      samples.push({
        ...load,
        inputMs,
        saveMs: timing.responseEnd - timing.requestStart,
      });
      await page.close();
    }
    const p95 = (key: keyof (typeof samples)[number]) =>
      samples.map((s) => s[key]).sort((a, b) => a - b)[
        Math.ceil(samples.length * 0.95) - 1
      ]!;
    const report = {
      measuredAt: new Date().toISOString(),
      node: process.version,
      os: `${platform()} ${arch()}`,
      cpu: cpus()[0]?.model,
      memoryGiB: Math.round(totalmem() / 1024 ** 3),
      browser: browser.version(),
      build: 'Next production / compiled Nest API',
      network:
        'loopback; browser HTTP cache disabled; no CPU/network throttling; warm servers',
      data: {
        users: 1,
        bodyRecords: 365,
        goals: 'unset',
        workouts: 0,
        meals: 0,
      },
      samples,
      p95: {
        lcpMs: p95('lcpMs'),
        inputMs: p95('inputMs'),
        saveMs: p95('saveMs'),
        jsTransferBytes: p95('jsTransferBytes'),
        jsDecodedBytes: p95('jsDecodedBytes'),
      },
    };
    writeFileSync(
      'test-results/performance.json',
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report));
    expect(report.p95.lcpMs).toBeGreaterThan(0);
    expect(report.p95.lcpMs).toBeLessThan(1500);
    expect(report.p95.inputMs).toBeLessThan(100);
    expect(report.p95.saveMs).toBeLessThan(500);
    expect(report.p95.jsTransferBytes).toBeLessThan(600000);
  } finally {
    await context.close();
    await user.close();
  }
});
