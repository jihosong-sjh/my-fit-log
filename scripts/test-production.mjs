import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';

// Always generate a new rehearsal project. Never read an existing production env.
const project = `myfit-rehearsal-${Date.now()}`;
const directory = mkdtempSync(join(tmpdir(), 'myfit-production-'));
const envFile = join(directory, '.env');
const password = randomBytes(24).toString('hex');
const sessionSecret = randomBytes(32).toString('hex');
const accountPassword = randomBytes(24).toString('hex');
const canary = `private-canary-${randomBytes(12).toString('hex')}`;
const secrets = [password, sessionSecret, accountPassword, canary];
const socket = createServer();
await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const variables = {
  COMPOSE_PROJECT_NAME: project,
  POSTGRES_USER: 'rehearsal',
  POSTGRES_PASSWORD: password,
  POSTGRES_DB: 'myfit_rehearsal',
  DATABASE_URL: `postgresql://rehearsal:${password}@db:5432/myfit_rehearsal`,
  SESSION_SECRET: sessionSecret,
  APP_URL: 'https://myfit-rehearsal.invalid',
  WEB_PORT: String(port),
};
writeFileSync(
  envFile,
  Object.entries(variables)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n'),
  { mode: 0o600 },
);
const env = { ...process.env, ...variables };
const args = [
  'compose',
  '--env-file',
  envFile,
  '-p',
  project,
  '-f',
  'compose.prod.yml',
];
const scrub = (text) =>
  secrets.reduce(
    (result, secret) => result.replaceAll(secret, '[REDACTED]'),
    text,
  );
function docker(command, input) {
  const result = spawnSync('docker', command, {
    env,
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(
      scrub(
        `${command.slice(0, 1)} failed\n${(result.stderr || result.stdout || result.error?.message || '').slice(-6000)}`,
      ),
    );
  return result.stdout.trim();
}
const compose = (command, input) => docker([...args, ...command], input);
const runApi = (command, input) =>
  compose(['run', '--rm', '-T', '--no-deps', 'api', ...command], input);
const step = (message) => console.log(`${new Date().toISOString()} ${message}`);
const request = (url, options = {}) =>
  fetch(url, {
    ...options,
    signal: AbortSignal.timeout(15000),
    headers: { ...options.headers, connection: 'close' },
  });
let completed = false;
try {
  const config = JSON.parse(compose(['config', '--format', 'json']));
  assert.equal(config.name, project);
  for (const name of ['api', 'db'])
    assert.equal(config.services[name].ports, undefined);
  for (const service of Object.values(config.services)) {
    assert.equal(service.logging.options['max-size'], '10m');
    assert.equal(service.logging.options['max-file'], '3');
    assert.ok(!(service.volumes ?? []).some((v) => v.type === 'bind'));
  }
  assert.equal(config.services.web.ports[0].host_ip, '127.0.0.1');
  step('Build production Web/API images');
  compose(['build']);
  step('Start isolated PostgreSQL, deploy migrations and seed catalog');
  compose(['up', '-d', '--wait', 'db']);
  runApi([
    'node',
    'apps/api/node_modules/prisma/build/index.js',
    'migrate',
    'deploy',
    '--config',
    'apps/api/prisma.config.mjs',
  ]);
  runApi(['node', 'apps/api/node_modules/@myfit/database/dist/src/seed.js']);
  runApi(
    [
      'node',
      'scripts/account.mjs',
      '--email',
      'rehearsal@test.invalid',
      '--password-stdin',
    ],
    `${accountPassword}\n`,
  );
  compose(['up', '-d', '--wait', '--wait-timeout', '120']);
  step(
    'Verify health, proxy, runtime contents, cookie policy and persistent writes',
  );
  const inspected = {};
  for (const name of ['web', 'api', 'db']) {
    const id = compose(['ps', '-q', name]);
    const container = JSON.parse(docker(['inspect', id]))[0];
    assert.equal(container.State.Health.Status, 'healthy');
    assert.equal(container.HostConfig.RestartPolicy.Name, 'unless-stopped');
    assert.equal(container.HostConfig.LogConfig.Config['max-size'], '10m');
    assert.equal(container.HostConfig.LogConfig.Config['max-file'], '3');
    assert.ok(
      container.Mounts.every(
        (mount) => mount.Type === 'volume' && mount.Name.startsWith(project),
      ),
    );
    if (name !== 'web') assert.deepEqual(container.HostConfig.PortBindings, {});
    if (name !== 'db') assert.equal(container.Config.User, 'node');
    inspected[name] = {
      image: container.Config.Image,
      healthy: true,
      user: container.Config.User,
      ports: container.HostConfig.PortBindings,
      logging: container.HostConfig.LogConfig,
      mounts: container.Mounts.map((mount) => mount.Name),
    };
  }
  for (const name of ['web', 'api']) {
    const root = name === 'web' ? '/app/apps/web' : '/app/apps/api';
    compose([
      'exec',
      '-T',
      name,
      'node',
      '-e',
      `const fs=require('node:fs');for(const path of ['${root}/src','/app/.env.development','${root}/node_modules/@nestjs/cli','/var/run/docker.sock'])if(fs.existsSync(path))process.exit(1)`,
    ]);
    if (name === 'web')
      compose([
        'exec',
        '-T',
        name,
        'node',
        '-e',
        `for (const dependency of ['typescript','eslint','@playwright/test','@nestjs/cli']) { try { require.resolve(dependency, { paths: ['${root}'] }); process.exit(1); } catch (error) { if(error.code !== 'MODULE_NOT_FOUND') throw error; } }`,
      ]);
  }
  const origin = `http://127.0.0.1:${port}`;
  const loginPage = await request(`${origin}/login`);
  assert.equal(loginPage.status, 200);
  assert.equal(loginPage.headers.get('x-frame-options'), 'DENY');
  assert.equal((await request(`${origin}/api/docs-json`)).status, 404);
  const headers = {
    origin: variables.APP_URL,
    'content-type': 'application/json',
  };
  const login = await request(`${origin}/api/v1/auth/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: 'rehearsal@test.invalid',
      password: accountPassword,
    }),
  });
  assert.equal(login.status, 200);
  const setCookie = login.headers.get('set-cookie');
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /Secure/);
  assert.match(setCookie, /SameSite=Lax/);
  const cookie = setCookie.split(';')[0];
  secrets.push(cookie, cookie.split('=')[1]);
  const authHeaders = { ...headers, cookie };
  const recordPath = '/api/v1/body/2026-09-27';
  const saved = await request(`${origin}${recordPath}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({ weight: '82.4', memo: canary }),
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get('cache-control'), 'no-store');
  assert.equal(
    (
      await request(`${origin}${recordPath}`, {
        method: 'PUT',
        headers: { ...authHeaders, origin: 'https://attacker.invalid' },
        body: JSON.stringify({ weight: '1' }),
      })
    ).status,
    403,
  );
  await request(`${origin}/api/v1/not-found?secret=${canary}`, {
    headers: { cookie, authorization: canary },
  });
  // Trigger a constraint error without logging the rejected row/SQL parameters.
  const rejected = spawnSync(
    'docker',
    [
      ...args,
      'exec',
      '-T',
      'db',
      'psql',
      '-U',
      'rehearsal',
      '-d',
      'myfit_rehearsal',
      '-c',
      'UPDATE "BodyRecord" SET weight = -1',
    ],
    { env, encoding: 'utf8' },
  );
  assert.notEqual(rejected.status, 0);
  function verifyLogs() {
    for (const service of ['web', 'api', 'db']) {
      const logs = compose(['logs', '--no-color', service]);
      assert.ok(logs.length > 0, `${service} stdout/stderr logs`);
      for (const secret of secrets)
        assert.ok(
          !logs.includes(secret),
          `${service} must omit private values`,
        );
    }
  }
  verifyLogs();
  step('Recreate all containers; verify DB records and session remain');
  compose(['down']);
  compose(['up', '-d', '--wait', '--wait-timeout', '120']);
  const retained = await request(
    `${origin}/api/v1/body?from=2026-09-27&to=2026-09-27`,
    { headers: authHeaders },
  );
  assert.equal(retained.status, 200);
  const body = (await retained.json()).data.records[0];
  assert.equal(body.weight, '82.4');
  assert.equal(body.memo, canary);
  verifyLogs();
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    'test-results/production.json',
    JSON.stringify(
      {
        verifiedAt: new Date().toISOString(),
        project,
        containers: inspected,
        checks: [
          'migration',
          'seed',
          'account-cli',
          'health',
          'proxy',
          'secure-cookie',
          'CSRF',
          'no-host-api-db',
          'no-source-or-socket-mount',
          'non-root-apps',
          'rotation-config',
          'private-values-omitted',
          'container-recreation',
          'record-and-session-persistence',
        ],
        realHttps: 'not tested; Phase 24/27',
      },
      null,
      2,
    ),
  );
  completed = true;
  step('Production rehearsal passed');
} finally {
  step('Remove only the generated rehearsal project and volume');
  assert.match(project, /^myfit-rehearsal-\d+$/);
  try {
    compose(['down', '--volumes', '--remove-orphans', '--rmi', 'local']);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  if (!completed) process.exitCode = 1;
}
