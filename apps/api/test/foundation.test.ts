import { Public } from '../src/auth/auth.guard';
import 'reflect-metadata';
import { after, before, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsInt, Min } from 'class-validator';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app';
import { PrismaService } from '../src/prisma/prisma.module';
import { validateEnvironment } from '../src/common/config';
class ProbeDto {
  @IsInt() @Min(1) count!: number;
}
@Public()
@Controller({ path: 'test-probe', version: '1' })
class ProbeController {
  @Post() create(@Body() data: ProbeDto) {
    return { count: data.count };
  }
  @Get('error') fail() {
    throw new Error(
      'password=secret-password postgres://secret-connection session-secret',
    );
  }
}
let app: INestApplication;
let base: string;
let databaseAvailable = true;
before(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [ProbeController],
  })
    .overrideProvider(PrismaService)
    .useValue({
      db: {
        $queryRaw: async () => {
          if (!databaseAvailable)
            throw new Error('postgres://private-db-password');
          return [{ ok: 1 }];
        },
      },
    })
    .compile();
  app = module.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => {
  await app?.close();
});
test('versioned success envelope, request ID and OpenAPI', async () => {
  const response = await fetch(`${base}/api/v1`);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get('x-request-id'));
  assert.deepEqual(await response.json(), {
    data: { name: 'MyFit Log', version: '1' },
  });
  const docs = (await (await fetch(`${base}/api/docs-json`)).json()) as {
    paths: Record<string, unknown>;
  };
  assert.ok(docs.paths['/api/v1']);
  assert.ok(docs.paths['/health/ready']);
});
test('strict DTO validation and standardized status/code without echoing inputs', async () => {
  const valid = await fetch(`${base}/api/v1/test-probe`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'http://localhost:3000',
    },
    body: JSON.stringify({ count: 2 }),
  });
  assert.equal(valid.status, 201);
  assert.deepEqual(await valid.json(), { data: { count: 2 } });
  for (const body of [
    { count: 0 },
    { count: '2' },
    { count: 2, password: 'secret-password' },
  ]) {
    const invalid = await fetch(`${base}/api/v1/test-probe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'http://localhost:3000',
      },
      body: JSON.stringify(body),
    });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), {
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request' },
    });
  }
  const missing = await fetch(`${base}/api/v2?token=secret-token`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), {
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
  });
});
test('readiness fails when DB is down but process liveness stays healthy', async () => {
  databaseAvailable = false;
  try {
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
    const response = await fetch(`${base}/health/ready`);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: { code: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },
    });
  } finally {
    databaseAvailable = true;
  }
  assert.equal((await fetch(`${base}/health/ready`)).status, 200);
});
test('errors and logs never expose raw exception, credentials, cookies or query strings', async () => {
  const lines: string[] = [];
  const log = mock.method(console, 'log', (...args: unknown[]) =>
    lines.push(JSON.stringify(args)),
  );
  const error = mock.method(console, 'error', (...args: unknown[]) =>
    lines.push(JSON.stringify(args)),
  );
  try {
    const response = await fetch(
      `${base}/api/v1/test-probe/error?token=secret-token`,
      {
        headers: {
          cookie: 'session=secret-cookie',
          authorization: 'Bearer secret-authorization',
        },
      },
    );
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    assert.ok(lines.some((line) => line.includes('request_error')));
    assert.doesNotMatch(lines.join('\n'), /secret-|postgres:|password/);
  } finally {
    log.mock.restore();
    error.mock.restore();
  }
});
test('configuration fails closed without including the rejected connection string', () => {
  assert.throws(() => validateEnvironment({ DATABASE_URL: 'secret-value' }), {
    message: 'DATABASE_URL must be a PostgreSQL connection URL',
  });
  assert.throws(() =>
    validateEnvironment({
      DATABASE_URL: 'postgresql://u:p@localhost/db',
      PORT: '0',
    }),
  );
});
