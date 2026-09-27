import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { AppShell } from '@/components/app-shell';
const pretendard = localFont({
  src: './fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  weight: '100 900',
  display: 'swap',
});
export const metadata = {
  title: { default: 'MyFit Log', template: '%s | MyFit Log' },
  description: '나의 운동과 식단 기록',
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
