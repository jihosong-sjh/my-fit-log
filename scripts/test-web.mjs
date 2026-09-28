import { execFileSync } from 'node:child_process';
import { cpSync } from 'node:fs';
const url = new URL(process.env.TEST_DATABASE_URL ?? '');
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.pathname !== '/myfit_test' ||
  url.port !== '5433'
)
  throw new Error('Isolated test DB required');
const env = {
  ...process.env,
  DATABASE_URL: url.toString(),
  NODE_ENV: 'development',
  PORT: '4100',
  APP_URL: 'http://localhost:3100',
  INTERNAL_API_URL: 'http://localhost:4100',
  E2E_BASE_URL: 'http://localhost:3100',
  NEXT_DIST_DIR:
    process.env.E2E_PRODUCTION === '1' ? '.next-performance' : '.next-test',
};
execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
  env,
  stdio: 'inherit',
});
execFileSync('pnpm', ['db:seed'], { env, stdio: 'inherit' });
if (env.E2E_PRODUCTION === '1') {
  execFileSync('pnpm', ['--filter', '@myfit/web', 'build'], {
    env: { ...env, NODE_ENV: 'production' },
    stdio: 'inherit',
  });
  cpSync(
    'apps/web/.next-performance/static',
    'apps/web/.next-performance/standalone/apps/web/.next-performance/static',
    { recursive: true },
  );
}
execFileSync('pnpm', ['exec', 'playwright', 'test', ...process.argv.slice(2)], {
  env,
  stdio: 'inherit',
});
