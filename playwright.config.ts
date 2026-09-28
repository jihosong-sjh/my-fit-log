import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  },
  workers: 1,
  reporter: 'list',
  webServer: process.env.E2E_BASE_URL
    ? [
        {
          command: 'pnpm --filter @myfit/api start',
          url: 'http://localhost:4100/health/ready',
          reuseExistingServer: false,
          timeout: 30000,
        },
        {
          command:
            process.env.E2E_PRODUCTION === '1'
              ? 'node apps/web/.next-performance/standalone/apps/web/server.js'
              : 'pnpm --filter @myfit/web dev --port 3100',
          env: {
            PORT: '3100',
            HOSTNAME: '127.0.0.1',
            NODE_ENV:
              process.env.E2E_PRODUCTION === '1' ? 'production' : 'development',
          },
          url: 'http://localhost:3100/login',
          reuseExistingServer: false,
          timeout: 60000,
        },
      ]
    : undefined,
});
