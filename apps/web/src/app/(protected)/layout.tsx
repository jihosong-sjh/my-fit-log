import type { ReactNode } from 'react';
import { requireUser } from '@/lib/session';
import { AuthProvider } from '@/components/auth-context';
import { AppShell } from '@/components/app-shell';
export default async function Layout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <AuthProvider user={user}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
