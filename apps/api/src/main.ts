import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { configureApp } from './app';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    logger: ['log', 'warn'],
  });
  configureApp(app);
  await app.listen(
    app.get(ConfigService).getOrThrow<number>('PORT'),
    '0.0.0.0',
  );
}
bootstrap().catch(() => {
  console.error(
    JSON.stringify({
      event: 'startup_failed',
      message: 'Check configuration and service availability',
    }),
  );
  process.exitCode = 1;
});
