import 'reflect-metadata';
import { randomBytes, randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { createDatabase, type PrismaClient } from '@myfit/database';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app';
import { manageAccount } from '../src/auth/accounts';
import { AuthService } from '../src/auth/auth.service';
export async function cleanupUsers(db: PrismaClient, ids: string[]) {
  const where = { userId: { in: ids } };
  await db.workoutSession.deleteMany({ where });
  await db.workoutRoutine.deleteMany({ where });
  await db.cardioRecord.deleteMany({ where });
  await db.meal.deleteMany({ where });
  await db.mealPreset.deleteMany({ where });
  await db.bodyRecord.deleteMany({ where });
  await db.exerciseFavorite.deleteMany({ where });
  await db.foodFavorite.deleteMany({ where });
  await db.exercise.deleteMany({ where: { ownerId: { in: ids } } });
  await db.food.deleteMany({ where: { ownerId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
}
export async function testContext() {
  if (new URL(process.env.DATABASE_URL!).pathname !== '/myfit_test')
    throw new Error('Isolated test database required');
  const db = createDatabase(process.env.DATABASE_URL!);
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  const base = await app.getUrl();
  const ids: string[] = [];
  async function makeUser() {
    const user = await manageAccount(
      db,
      'create',
      `${randomUUID()}@test.invalid`,
      'Test user',
      'Fixture-password-123',
    );
    ids.push(user.id);
    const token = randomBytes(32).toString('base64url');
    await db.session.create({
      data: {
        userId: user.id,
        tokenHash: app.get(AuthService).tokenHash(token),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    return { id: user.id, cookie: `myfit_session=${token}` };
  }
  const user = await makeUser();
  async function request(
    method: string,
    path: string,
    json?: unknown,
    cookie = user.cookie,
  ) {
    return fetch(`${base}/api/v1${path}`, {
      method,
      headers: {
        origin: process.env.APP_URL ?? 'http://localhost:3000',
        cookie,
        ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  }
  return {
    db,
    app,
    base,
    user,
    makeUser,
    request,
    async close() {
      await app.close();
      await cleanupUsers(db, ids);
      await db.$disconnect();
    },
  };
}
