import { defineConfig } from 'prisma/config';
export default defineConfig({
  schema: '/app/prisma/schema.prisma',
  migrations: { path: '/app/prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
