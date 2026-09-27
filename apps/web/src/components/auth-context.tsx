'use client';
import { createContext, useContext, type ReactNode } from 'react';
export type SessionUser = { id: string; email: string; name: string };
const AuthContext = createContext<SessionUser | null>(null);
export function AuthProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
export function useUser() {
  return useContext(AuthContext);
}
