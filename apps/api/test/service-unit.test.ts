import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.module';
import { PublicError } from '../src/common/errors';
import {
  rangeDates,
  weightSeries,
  weightDifference,
  type LoadedStats,
} from '../src/common/aggregation';

test('AuthService limits by account across IPs, expires windows and ignores malformed tokens', (t) => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const service = new AuthService(
    {} as PrismaService,
    new ConfigService({
      SESSION_SECRET: 'unit-test-secret-with-at-least-32-characters',
      NODE_ENV: 'production',
    }),
  );
  for (let i = 0; i < 20; i++) service.limit(`ip-${i}`, 'test@example.invalid');
  assert.throws(
    () => service.limit('new-ip', 'test@example.invalid'),
    (e: unknown) => e instanceof PublicError && e.code === 'RATE_LIMITED',
  );
  now += 15 * 60 * 1000;
  assert.doesNotThrow(() => service.limit('new-ip', 'test@example.invalid'));
  assert.equal(service.tokenFromCookie('myfit_session=bad-token'), null);
  assert.equal(service.tokenFromCookie(), null);
  assert.match(
    service.cookie('opaque', new Date(now)),
    /HttpOnly; Secure; SameSite=Lax/,
  );
});

test('aggregation service calendar windows preserve missing days and use six-day lookback', () => {
  const stats = {
    body: [
      { date: '2024-02-23', weight: '90' },
      { date: '2024-02-24', weight: '82.4' },
      { date: '2024-02-29', weight: '81.2' },
      { date: '2024-03-01', weight: '80.8' },
    ],
  } as LoadedStats;
  assert.deepEqual(rangeDates('2024-02-28', '2024-03-01'), [
    '2024-02-28',
    '2024-02-29',
    '2024-03-01',
  ]);
  assert.deepEqual(weightSeries(stats, '2024-02-29', '2024-03-02'), [
    {
      date: '2024-02-29',
      weight: '81.2',
      average: '84.53333333333333333333333333333333333333',
    },
    {
      date: '2024-03-01',
      weight: '80.8',
      average: '81.46666666666666666666666666666666666667',
    },
    { date: '2024-03-02', weight: null, average: '81' },
  ]);
  assert.equal(weightDifference(stats, '2024-02-29', '2024-03-01'), '-0.4');
  assert.equal(weightDifference(stats, '2024-03-02', '2024-03-03'), null);
  assert.throws(() => rangeDates('2024-03-01', '2024-02-29'), PublicError);
  assert.throws(() => rangeDates('2000-01-01', '2024-03-01'), PublicError);
});
