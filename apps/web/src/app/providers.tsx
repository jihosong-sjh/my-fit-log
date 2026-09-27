'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@myfit/ui/sonner';
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());
  useEffect(() => {
    const refresh = () => void client.invalidateQueries({ queryKey: ['api'] });
    window.addEventListener('myfit:records-changed', refresh);
    return () => window.removeEventListener('myfit:records-changed', refresh);
  }, [client]);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster richColors closeButton position="top-center" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
