import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
const require = createRequire(
  new URL('../apps/api/package.json', import.meta.url),
);
const { createDatabase } = require('@myfit/database');
const { manageAccount } = require('./dist/auth/accounts.js');
const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string', default: '사용자' },
    reset: { type: 'boolean' },
    prune: { type: 'boolean' },
    'password-stdin': { type: 'boolean' },
  },
});
async function secret(prompt) {
  if (!process.stdin.isTTY)
    throw new Error('Use --password-stdin for noninteractive input.');
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (data) => {
      for (const char of data) {
        if (char === '\r' || char === '\n') {
          finish();
          resolve(value);
          return;
        }
        if (char === '\u0003') {
          finish();
          reject(new Error('Cancelled'));
          return;
        }
        if (char === '\u007f') value = value.slice(0, -1);
        else if (char >= ' ') value += char;
      }
    };
    function finish() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off('data', onData);
      process.stdout.write('\n');
    }
    process.stdin.on('data', onData);
  });
}
const db = createDatabase(process.env.DATABASE_URL);
try {
  if (values.prune) {
    const result = await db.session.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
    console.log(`Removed ${result.count} expired sessions.`);
  } else {
    if (!values.email) throw new Error('--email is required');
    let password;
    if (values['password-stdin']) {
      const chunks = [];
      for await (const chunk of process.stdin) chunks.push(chunk);
      password = Buffer.concat(chunks)
        .toString()
        .replace(/\r?\n$/, '');
    } else {
      password = await secret('비밀번호 (12자 이상, 화면에 표시되지 않음): ');
      if (password !== (await secret('비밀번호 확인: ')))
        throw new Error('Passwords do not match');
    }
    await manageAccount(
      db,
      values.reset ? 'reset' : 'create',
      values.email,
      values.name,
      password,
    );
    console.log(
      values.reset
        ? 'Password reset; all sessions revoked.'
        : 'Account created with default goals and preferences.',
    );
  }
} catch {
  console.error(
    'Account command failed. Check input, duplicate email and database availability.',
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
