'use client';
import type { ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from './auth-context';
import { api, errorMessage } from '@/lib/api';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import {
  Activity,
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Scale,
  ChartNoAxesCombined,
  CalendarDays,
  Settings,
  Sun,
  Moon,
  Monitor,
  Menu,
  BookOpen,
} from 'lucide-react';
import { Button } from '@myfit/ui/button';
import { QuickAdd } from './quick-add';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@myfit/ui/dropdown-menu';
import { cn } from '@myfit/ui/utils';
const navigation = [
  { href: '/dashboard', label: '오늘', icon: LayoutDashboard },
  { href: '/workout', label: '운동', icon: Dumbbell },
  { href: '/diet', label: '식단', icon: Utensils },
  { href: '/body', label: '신체', icon: Scale },
  { href: '/analytics', label: '분석', icon: ChartNoAxesCombined },
  { href: '/calendar', label: '캘린더', icon: CalendarDays },
];
function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const user = useUser();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="테마 변경">
          <Sun aria-hidden="true" className="dark:hidden" />
          <Moon aria-hidden="true" className="hidden dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>화면 테마</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={async (value) => {
            setTheme(value);
            if (user) {
              try {
                await api('/settings', {
                  method: 'PATCH',
                  json: { theme: value.toUpperCase() },
                });
              } catch (error) {
                setTheme(theme ?? 'system');
                toast.error(errorMessage(error));
              }
            }
          }}
        >
          <DropdownMenuRadioItem value="light">
            <Sun aria-hidden="true" />
            라이트
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon aria-hidden="true" />
            다크
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor aria-hidden="true" />
            시스템
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const user = useUser();
  const router = useRouter();
  return (
    <div className="min-h-dvh">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-md bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0"
      >
        본문으로 이동
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r bg-surface px-5 py-7 md:flex">
        <Link
          href="/"
          className="mb-10 flex items-center gap-2.5 px-3 text-xl font-bold tracking-tight"
        >
          <Activity aria-hidden="true" className="size-6 text-brand" />
          MyFit Log
        </Link>
        <nav aria-label="주 메뉴" className="space-y-1">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted',
                pathname === href &&
                  'bg-secondary font-semibold text-secondary-foreground',
              )}
            >
              <Icon aria-hidden="true" className="size-[18px]" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-2 border-t pt-5">
          <Link
            href="/settings"
            className="flex min-h-11 items-center gap-3 px-3 text-muted-foreground"
          >
            <Settings aria-hidden="true" className="size-[18px]" />
            설정
          </Link>
          <Link
            href="/design-system"
            className="flex min-h-11 items-center gap-3 px-3 caption"
          >
            <BookOpen aria-hidden="true" className="size-[18px]" />
            컴포넌트 가이드
          </Link>
        </div>
      </aside>
      <div className="min-w-0 md:ml-[232px]">
        <header className="flex h-[76px] items-center justify-between border-b bg-surface px-5 md:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold md:hidden"
          >
            <Activity aria-hidden="true" className="size-5 text-brand" />
            MyFit Log
          </Link>
          <p className="hidden text-sm text-muted-foreground md:block">
            나를 알아가는 작은 기록
          </p>
          <div className="flex items-center gap-1">
            <div className="hidden md:block">
              <QuickAdd />
            </div>
            {user && (
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await api('/auth/logout', { method: 'POST' });
                    queryClient.clear();
                    router.replace('/login');
                    router.refresh();
                  } catch (error) {
                    toast.error(errorMessage(error));
                  }
                }}
              >
                로그아웃
              </Button>
            )}
            <ThemeMenu />
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="전체 메뉴">
                    <Menu aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {[
                    ...navigation,
                    { href: '/settings', label: '설정', icon: Settings },
                    {
                      href: '/design-system',
                      label: '컴포넌트 가이드',
                      icon: BookOpen,
                    },
                  ].map(({ href, label }) => (
                    <DropdownMenuItem asChild key={href}>
                      <Link href={href}>{label}</Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        {children}
      </div>
      <nav
        aria-label="모바일 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-center border-t bg-surface px-2 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {[
          navigation[0]!,
          navigation[1]!,
          null,
          navigation[2]!,
          navigation[4]!,
        ].map((item, index) =>
          item ? (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 text-xs text-muted-foreground',
                pathname === item.href &&
                  'font-semibold text-secondary-foreground',
              )}
            >
              <item.icon aria-hidden="true" className="size-5" />
              {item.label}
            </Link>
          ) : (
            <div className="flex justify-center" key={index}>
              <QuickAdd mobile />
            </div>
          ),
        )}
      </nav>
    </div>
  );
}
