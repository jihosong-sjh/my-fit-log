'use client';
import { useFormGuard } from '@/lib/form-guard';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Input } from '@myfit/ui/input';
import { NumberInput } from '@myfit/ui/fields';
import { Button } from '@myfit/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@myfit/ui/card';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { ErrorState, LoadingState } from '@/components/resource-state';
type GoalKey =
  | 'targetWeight'
  | 'dailyCalories'
  | 'proteinGoal'
  | 'carbGoal'
  | 'fatGoal';
type Settings = {
  profile: { id: string; name: string; email: string };
  goal: Record<GoalKey, string | null> & { weeklyWorkoutGoal: number | null };
  preference: { theme: 'LIGHT' | 'DARK' | 'SYSTEM' };
};
const fields: [GoalKey, string, string][] = [
  ['targetWeight', '목표 체중', 'kg'],
  ['dailyCalories', '일일 열량', 'kcal'],
  ['proteinGoal', '단백질', 'g'],
  ['carbGoal', '탄수화물', 'g'],
  ['fatGoal', '지방', 'g'],
];
function SettingsForm({ initial }: { initial: Settings }) {
  const guard = useFormGuard();
  const router = useRouter();
  const { setTheme, theme: activeTheme } = useTheme();
  const [name, setName] = useState(initial.profile.name);
  const [goals, setGoals] = useState(initial.goal);
  const [selectedTheme, changeTheme] = useState<
    Settings['preference']['theme'] | null
  >(null);
  const theme =
    selectedTheme ??
    ((
      activeTheme ?? initial.preference.theme
    ).toUpperCase() as Settings['preference']['theme']);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const payload = Object.fromEntries(
        fields.map(([key]) => [key, goals[key] || null]),
      );
      await api<Settings>('/settings', {
        method: 'PATCH',
        json: {
          name,
          theme,
          ...payload,
          weeklyWorkoutGoal: goals.weeklyWorkoutGoal,
        },
      });
      setTheme(theme.toLowerCase());
      changeTheme(null);
      guard.markSaved();
      recordsChanged();
      router.refresh();
      toast.success('설정을 저장했어요');
    } catch (e) {
      const message = errorMessage(e);
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      {...guard.props}
      className="max-w-3xl space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      onKeyDown={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) return;
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
    >
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>프로필</CardTitle>
        </CardHeader>
        <CardContent>
          <label htmlFor="profile-name" className="mb-2 block">
            이름
          </label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
          />
          <p className="mt-3 caption">{initial.profile.email}</p>
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>나의 목표</CardTitle>
          <p className="text-sm text-muted-foreground">
            빈칸으로 두면 목표를 설정하지 않습니다. 과거 기록의 달성률도 현재
            목표를 기준으로 표시합니다.
          </p>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          {fields.map(([key, label, unit]) => (
            <div key={key}>
              <label htmlFor={key} className="mb-2 block">
                {label} ({unit})
              </label>
              <NumberInput
                id={key}
                value={goals[key] ?? ''}
                min="0.01"
                max={key === 'targetWeight' ? '99999.99' : '99999999.99'}
                onChange={(e) =>
                  setGoals({ ...goals, [key]: e.target.value || null })
                }
                placeholder="미설정"
              />
            </div>
          ))}
          <div>
            <label htmlFor="weekly-goal" className="mb-2 block">
              주간 운동일 (1~7일)
            </label>
            <NumberInput
              id="weekly-goal"
              value={goals.weeklyWorkoutGoal ?? ''}
              min="1"
              max="7"
              step="1"
              inputMode="numeric"
              onChange={(e) =>
                setGoals({
                  ...goals,
                  weeklyWorkoutGoal:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
              placeholder="미설정"
            />
          </div>
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>화면 테마</CardTitle>
        </CardHeader>
        <CardContent>
          <label htmlFor="theme" className="sr-only">
            화면 테마
          </label>
          <select
            id="theme"
            className="h-11 w-full rounded-md border bg-surface px-3"
            value={theme}
            onChange={(e) =>
              changeTheme(e.target.value as Settings['preference']['theme'])
            }
          >
            <option value="SYSTEM">시스템 설정 따르기</option>
            <option value="LIGHT">라이트</option>
            <option value="DARK">다크</option>
          </select>
        </CardContent>
      </Card>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? '저장 중…' : '설정 저장'}
      </Button>
    </form>
  );
}
export default function SettingsPage() {
  const { data, error, loading, reload } = useResource<Settings>('/settings');
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <h1 className="mb-7">설정</h1>
      {error && <ErrorState message={error} retry={reload} />}{' '}
      {!data && loading ? (
        <LoadingState />
      ) : (
        data && <SettingsForm initial={data} />
      )}
    </main>
  );
}
