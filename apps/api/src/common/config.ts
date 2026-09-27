export function validateEnvironment(env: Record<string, unknown>) {
  const databaseUrl = env.DATABASE_URL;
  if (typeof databaseUrl !== 'string')
    throw new Error('DATABASE_URL is required');
  try {
    const url = new URL(databaseUrl);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.pathname.slice(1)
    )
      throw new Error();
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }
  const port = Number(env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('PORT must be between 1 and 65535');
  const nodeEnv = env.NODE_ENV ?? 'development';
  if (!['development', 'test', 'production'].includes(String(nodeEnv)))
    throw new Error('Invalid NODE_ENV');
  const secret = env.SESSION_SECRET;
  if (typeof secret !== 'string' || secret.length < 32)
    throw new Error('SESSION_SECRET must contain at least 32 characters');
  const appUrl = env.APP_URL;
  try {
    const url = new URL(String(appUrl));
    if (
      url.origin !== appUrl ||
      !['http:', 'https:'].includes(url.protocol) ||
      (nodeEnv === 'production' && url.protocol !== 'https:')
    )
      throw new Error();
  } catch {
    throw new Error('APP_URL must be an origin (HTTPS in production)');
  }
  return { ...env, DATABASE_URL: databaseUrl, PORT: port, NODE_ENV: nodeEnv };
}
