'use client';
import { useTheme } from 'next-themes';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
export type SessionUser = {
  id: string;
  email: string;
  name: string;
  preference?: { theme: 'LIGHT' | 'DARK' | 'SYSTEM' };
};
const AuthContext = createContext<SessionUser | null>(null);
export function AuthProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const { setTheme } = useTheme();
  useEffect(() => {
    if (user.preference) setTheme(user.preference.theme.toLowerCase());
  }, [user.preference, setTheme]);
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
export function useUser() {
  return useContext(AuthContext);
}
