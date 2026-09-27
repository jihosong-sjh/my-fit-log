import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  preference?: { theme: 'LIGHT' | 'DARK' | 'SYSTEM' };
};
export async function requireUser(): Promise<SessionUser> {
  const jar = await cookies();
  const response = await fetch(
    `${process.env.INTERNAL_API_URL ?? 'http://localhost:4000'}/api/v1/auth/me`,
    { headers: { cookie: jar.toString() }, cache: 'no-store' },
  );
  if (response.status === 401) redirect('/login');
  if (!response.ok)
    throw new Error(
      '인증 서버에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.',
    );
  return (await response.json()).data;
}
