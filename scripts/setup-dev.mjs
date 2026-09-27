import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env.development')) {
  console.log('.env.development already exists; left unchanged.');
} else {
  const password = randomBytes(24).toString('hex');
  writeFileSync(
    '.env.development',
    `POSTGRES_USER=myfit
POSTGRES_PASSWORD=${password}
POSTGRES_DB=myfit_dev
DATABASE_URL=postgresql://myfit:${password}@localhost:5432/myfit_dev
TEST_DATABASE_URL=postgresql://myfit:${password}@localhost:5433/myfit_test
INTERNAL_API_URL=http://localhost:4000
APP_URL=http://localhost:3000
`,
    { mode: 0o600 },
  );
  console.log('Created .env.development (mode 0600).');
}
