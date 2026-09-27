/** Only the two explicit loopback aliases share a development trust boundary. */
export function isAllowedOrigin(
  origin: string | undefined,
  appUrl: string,
  nodeEnv: string,
): boolean {
  if (origin === appUrl) return true;
  if (nodeEnv !== 'development' && nodeEnv !== 'test') return false;
  const configured = new URL(appUrl);
  if (!['localhost', '127.0.0.1'].includes(configured.hostname)) return false;
  configured.hostname =
    configured.hostname === 'localhost' ? '127.0.0.1' : 'localhost';
  return origin === configured.origin;
}
