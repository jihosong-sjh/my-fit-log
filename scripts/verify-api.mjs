import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const check = (path) =>
  fetch(`http://localhost:4000${path}`, { signal: AbortSignal.timeout(6000) });
assert.equal((await check('/health/ready')).status, 200);
assert.equal((await fetch('http://localhost:3000/api/v1')).status, 200);
const docs = await (await fetch('http://localhost:3000/api/docs-json')).json();
assert.ok(docs.paths['/api/v1']);
try {
  execFileSync('docker', ['stop', 'myfit-db-dev'], { stdio: 'ignore' });
  assert.equal((await check('/health/live')).status, 200);
  const response = await check('/health/ready');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'SERVICE_UNAVAILABLE');
} finally {
  execFileSync('docker', ['start', 'myfit-db-dev'], { stdio: 'ignore' });
}
let ready = false;
for (let i = 0; i < 20; i++) {
  try {
    if ((await check('/health/ready')).ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert.ok(ready, 'DB must recover');
console.log(
  'PASS: same-origin API/OpenAPI, real PostgreSQL outage, liveness and readiness recovery',
);
