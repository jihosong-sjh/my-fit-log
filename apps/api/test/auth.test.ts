import 'reflect-metadata';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app';
import { PrismaService } from '../src/prisma/prisma.module';
import { AuthService } from '../src/auth/auth.service';
import { manageAccount } from '../src/auth/accounts';
import { createDatabase } from '@myfit/database';
if (new URL(process.env.DATABASE_URL!).pathname !== '/myfit_test')
  throw new Error('Isolated DB required');
const db = createDatabase(process.env.DATABASE_URL!);
const email = `${randomUUID()}@test.invalid`;
const password = 'Testing-only-password-123';
let userId: string;
let app: INestApplication;
let base: string;
async function start() {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
}
async function login(inputPassword = password) {
  return fetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ email, password: inputPassword }),
  });
}
const me = (cookie: string) =>
  fetch(`${base}/api/v1/auth/me`, { headers: { cookie } });
before(async () => {
  userId = (await manageAccount(db, 'create', email, '테스트', password)).id;
  await start();
});
after(async () => {
  await app?.close();
  await db.user.delete({ where: { id: userId } });
  await db.$disconnect();
});
test('account defaults, Argon2id, strict Origin and failed login', async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { goal: true, preference: true },
  });
  assert.match(user.passwordHash, /^\$argon2id\$/);
  assert.equal(user.goal?.targetWeight, null);
  assert.equal(user.preference?.theme, 'SYSTEM');
  assert.equal((await login('wrong-password-123')).status, 401);
  assert.equal(
    (
      await fetch(`${base}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'https://evil.invalid',
        },
        body: JSON.stringify({ email, password }),
      })
    ).status,
    403,
  );
  assert.equal((await me('myfit_session=invalid')).status, 401);
});
test('persistent session, opaque cookie, secret rotation, expiry and logout', async () => {
  const response = await login();
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie')!;
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Path=\//);
  assert.doesNotMatch(cookie, /Secure|Domain=/);
  const data = await response.json();
  assert.equal(data.data.id, userId);
  assert.equal(data.data.passwordHash, undefined);
  const stored = await db.session.findFirstOrThrow({ where: { userId } });
  assert.ok(!cookie.includes(stored.tokenHash));
  await app.close();
  await start();
  assert.equal((await me(cookie)).status, 200);
  const config = app.get(ConfigService);
  const original = config.get('SESSION_SECRET');
  config.set('SESSION_SECRET', 'rotated-secret-'.repeat(4));
  assert.equal((await me(cookie)).status, 401);
  config.set('SESSION_SECRET', original);
  config.set('NODE_ENV', 'production');
  assert.match(app.get(AuthService).cookie('token', new Date()), /Secure/);
  config.set('NODE_ENV', 'test');
  await db.session.update({
    where: { id: stored.id },
    data: {
      createdAt: new Date(Date.now() - 172800000),
      expiresAt: new Date(Date.now() - 86400000),
    },
  });
  assert.equal((await me(cookie)).status, 401);
  const second = await login();
  const secondCookie = second.headers.get('set-cookie')!;
  const logout = await fetch(`${base}/api/v1/auth/logout`, {
    method: 'POST',
    headers: { cookie: secondCookie, origin: 'http://localhost:3000' },
  });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/);
  assert.equal((await me(secondCookie)).status, 401);
});
test('admin password reset revokes all existing sessions', async () => {
  const cookie = (await login()).headers.get('set-cookie')!;
  await manageAccount(db, 'reset', email, '테스트', 'Replacement-password-456');
  assert.equal((await me(cookie)).status, 401);
  assert.equal(await db.session.count({ where: { userId } }), 0);
  assert.equal((await login()).status, 401);
  assert.equal((await login('Replacement-password-456')).status, 200);
});
test('login rate limit and command-line account creation without password arguments', async () => {
  const auth = new AuthService(
    { db } as PrismaService,
    new ConfigService({ SESSION_SECRET: 'test-secret-'.repeat(4) }),
  );
  for (let i = 0; i < 20; i++) auth.limit('test-ip', 'test@example.invalid');
  assert.throws(() => auth.limit('test-ip', 'test@example.invalid'));
  const cliEmail = `${randomUUID()}@test.invalid`;
  try {
    const output = execFileSync(
      process.execPath,
      [
        resolve('../../scripts/account.mjs'),
        '--email',
        cliEmail,
        '--name',
        'CLI test',
        '--password-stdin',
      ],
      { input: password + '\n', encoding: 'utf8', env: process.env },
    );
    assert.match(output, /Account created/);
    assert.ok(!output.includes(password));
    assert.equal(await db.user.count({ where: { email: cliEmail } }), 1);
  } finally {
    await db.user.deleteMany({ where: { email: cliEmail } });
  }
});
