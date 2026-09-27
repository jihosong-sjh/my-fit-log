'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import { Button } from '@myfit/ui/button';
import { Input } from '@myfit/ui/input';
import { Card, CardContent } from '@myfit/ui/card';
import { api, ApiClientError, errorMessage } from '@/lib/api';
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <main id="main-content" className="grid min-h-dvh place-items-center p-5">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 text-xl font-bold">
          <Activity className="size-6 text-brand" aria-hidden="true" />
          MyFit Log
        </div>
        <Card className="shadow-none">
          <CardContent className="p-7">
            <h1>다시 만나 반가워요</h1>
            <p className="mt-3 text-muted-foreground">
              나의 운동과 식단 기록을 이어가세요.
            </p>
            <form
              className="mt-7 space-y-5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) return;
                setBusy(true);
                setError('');
                try {
                  await api('/auth/login', {
                    method: 'POST',
                    json: { email, password },
                  });
                  setPassword('');
                  router.replace('/dashboard');
                  router.refresh();
                } catch (e) {
                  setError(
                    e instanceof ApiClientError && e.status === 401
                      ? '이메일 또는 비밀번호를 확인해주세요.'
                      : errorMessage(e),
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <div>
                <label htmlFor="email" className="mb-2 block font-medium">
                  이메일
                </label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-2 block font-medium">
                  비밀번호
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              )}
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? '로그인 중…' : '로그인'}
              </Button>
            </form>
            <p className="mt-6 caption">
              개인 계정으로만 로그인할 수 있습니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
