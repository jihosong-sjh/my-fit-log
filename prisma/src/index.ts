import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';
export { Prisma, PrismaClient } from '../generated/client';
export * from '../generated/enums';
export function createDatabase(url: string) {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      connectionTimeoutMillis: 2000,
      query_timeout: 3000,
      max: 10,
    }),
  });
}
export { UserStore } from './user-store';
