import type { ReactNode } from 'react';
export const metadata = {
  title: 'MyFit Log',
  description: '나의 운동과 식단 기록',
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
