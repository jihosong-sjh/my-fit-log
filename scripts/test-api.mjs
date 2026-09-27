import { execFileSync } from 'node:child_process';
const url = new URL(process.env.TEST_DATABASE_URL ?? '');
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  url.pathname !== '/myfit_test' ||
  url.port !== '5433'
)
  throw new Error('Isolated localhost:5433/myfit_test required');
const env = { ...process.env, DATABASE_URL: url.toString(), NODE_ENV: 'test' };
execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
  env,
  stdio: 'inherit',
});
execFileSync('pnpm', ['db:seed'], { env, stdio: 'inherit' });
execFileSync('pnpm', ['--filter', '@myfit/api', 'build'], {
  env,
  stdio: 'inherit',
});
execFileSync('pnpm', ['--filter', '@myfit/api', 'test'], {
  env,
  stdio: 'inherit',
});
