import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';
config({ path: '.env.development', quiet: true });
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations', seed: 'tsx prisma/src/seed.ts' },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://unused:unused@localhost:5432/myfit_dev',
  },
});
