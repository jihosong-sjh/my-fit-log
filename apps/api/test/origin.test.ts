import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedOrigin } from '../src/auth/origin';
test('development loopback aliases preserve scheme and port, production is exact', () => {
  assert.equal(
    isAllowedOrigin(
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'development',
    ),
    true,
  );
  assert.equal(
    isAllowedOrigin('http://localhost:3100', 'http://127.0.0.1:3100', 'test'),
    true,
  );
  for (const origin of [
    undefined,
    'null',
    'http://evil.invalid:3000',
    'http://localhost.evil.invalid:3000',
    'http://127.0.0.1:4000',
    'https://127.0.0.1:3000',
  ])
    assert.equal(
      isAllowedOrigin(origin, 'http://localhost:3000', 'development'),
      false,
    );
  assert.equal(
    isAllowedOrigin(
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'production',
    ),
    false,
  );
  assert.equal(
    isAllowedOrigin(
      'https://myfit.example',
      'https://myfit.example',
      'production',
    ),
    true,
  );
  assert.equal(
    isAllowedOrigin(
      'http://127.0.0.1:3000',
      'https://myfit.example',
      'development',
    ),
    false,
  );
});
