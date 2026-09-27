export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, ...init } = options;
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      ...(json !== undefined ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });
  const result = await response.json();
  if (!response.ok)
    throw new ApiClientError(
      response.status,
      result.error?.code ?? 'REQUEST_FAILED',
      result.error?.message ?? 'Request failed',
    );
  return result.data as T;
}
export function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.status === 401)
      return '로그인이 필요합니다. 다시 로그인해주세요.';
    if (error.status === 409)
      return '기록이 변경되었습니다. 최신 기록을 확인해주세요.';
    if (error.status === 429)
      return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
    if (error.status === 400) return '입력한 값과 필수 항목을 확인해주세요.';
    if (error.status === 404) return '기록을 찾을 수 없습니다.';
  }
  return '요청을 완료하지 못했습니다. 연결을 확인하고 다시 시도해주세요.';
}
export function recordsChanged() {
  window.dispatchEvent(new Event('myfit:records-changed'));
}
