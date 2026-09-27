import { spawn } from 'node:child_process';
const child = spawn('pnpm', ['--parallel', '--filter', './apps/*', 'dev'], {
  stdio: 'inherit',
  env: process.env,
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => child.kill(signal));
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
