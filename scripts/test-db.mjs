import { execFileSync } from 'node:child_process';
const url = new URL(process.env.TEST_DATABASE_URL ?? '');
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.pathname !== '/myfit_test' ||
  url.port !== '5433'
) {
  throw new Error('Tests require isolated localhost:5433/myfit_test');
}
const env = { ...process.env, DATABASE_URL: url.toString() };
execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
  env,
  stdio: 'inherit',
});
execFileSync('pnpm', ['exec', 'tsx', '--test', 'prisma/src/database.test.ts'], {
  env,
  stdio: 'inherit',
});
