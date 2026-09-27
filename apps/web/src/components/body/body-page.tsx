'use client';
import { useFormGuard, confirmUnsavedForms } from '@/lib/form-guard';
import { useState } from 'react';
import { Scale } from 'lucide-react';
import { toast } from 'sonner';
import {
  localDate,
  periodStart,
  type Period,
  type BodyRecord,
  type BodyHistory,
} from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { DatePicker, NumberInput } from '@myfit/ui/fields';
import { Card, CardHeader, CardTitle, CardContent } from '@myfit/ui/card';
import { EmptyState } from '@myfit/ui/summary';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { TrendChart } from '../trend-chart';
import { QuickWeight } from './quick-weight';
import { ErrorState, LoadingState } from '../resource-state';
function BodyForm({
  date,
  initial,
}: {
  date: string;
  initial: BodyRecord | null;
}) {
  const guard = useFormGuard();
  const [value, setValue] = useState({
    weight: initial?.weight ?? '',
    bodyFat: initial?.bodyFat ?? '',
    muscleMass: initial?.muscleMass ?? '',
    waist: initial?.waist ?? '',
    memo: initial?.memo ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      {...guard.props}
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await api(`/body/${date}`, {
            method: 'PUT',
            json: {
              weight: value.weight,
              bodyFat: value.bodyFat || null,
              muscleMass: value.muscleMass || null,
              waist: value.waist || null,
              memo: value.memo || null,
            },
          });
          guard.markSaved();
          recordsChanged();
          toast.success('신체 기록을 저장했어요');
        } catch (e) {
          setError(errorMessage(e));
          toast.error(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
      onKeyDown={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) return;
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
    >
      <div className="grid grid-cols-2 gap-4">
        {(
          [
            ['weight', '체중 (kg)'],
            ['bodyFat', '체지방률 (%)'],
            ['muscleMass', '근육량 (kg)'],
            ['waist', '허리둘레 (cm)'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`body-${key}`} className="mb-2 block">
              {label}
              {key === 'weight' ? '' : ' · 선택'}
            </label>
            <NumberInput
              id={`body-${key}`}
              value={value[key]}
              onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              required={key === 'weight'}
              min={key === 'bodyFat' ? '0' : '0.01'}
              max={key === 'bodyFat' ? '100' : '99999.99'}
              step={key === 'bodyFat' ? '0.1' : '0.01'}
            />
          </div>
        ))}
      </div>
      <div>
        <label htmlFor="body-memo" className="mb-2 block">
          메모
        </label>
        <textarea
          id="body-memo"
          className="min-h-24 w-full rounded-md border bg-surface p-3"
          value={value.memo}
          maxLength={2000}
          onChange={(e) => setValue({ ...value, memo: e.target.value })}
        />
      </div>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy ? '저장 중…' : error ? '다시 저장' : '신체 기록 저장'}
      </Button>
      <p className="caption">
        같은 날의 기록이 있으면 갱신합니다. 선택 항목을 비우고 저장하면 해당
        값이 삭제됩니다.
      </p>
    </form>
  );
}
export function BodyPage({
  initialDate,
  quick = false,
}: { initialDate?: string; quick?: boolean } = {}) {
  const today = localDate(new Date());
  const [date, setDate] = useState(initialDate ?? today);
  const [end, setEnd] = useState(initialDate ?? today);
  const [period, setPeriod] = useState<Period>('30D');
  const history = useResource<BodyHistory>(
    `/body?from=${periodStart(end, period)}&to=${end}`,
  );
  const selected = useResource<BodyRecord | null>(`/body/${date}`);
  return (
    <main id="main-content" tabIndex={-1} className="page-content">
      <h1 className="mb-7">신체 기록</h1>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>{quick ? '빠른 체중 기록' : '오늘의 몸 상태'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5">
              <label htmlFor="body-date" className="mb-2 block">
                측정일
              </label>
              <DatePicker
                id="body-date"
                value={date}
                onChange={(e) => {
                  if (e.target.value && confirmUnsavedForms())
                    setDate(e.target.value);
                }}
                required
              />
            </div>
            {selected.error && (
              <ErrorState message={selected.error} retry={selected.reload} />
            )}{' '}
            {quick ? (
              <QuickWeight date={date} />
            ) : selected.loading ? (
              <LoadingState />
            ) : (
              selected.data !== undefined && (
                <BodyForm
                  date={date}
                  initial={selected.data}
                  key={`${date}:${selected.data?.id ?? 'new'}`}
                />
              )
            )}
          </CardContent>
        </Card>
        <Card className="min-w-0 shadow-none">
          <CardHeader>
            <CardTitle>체중 변화</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-5 flex flex-wrap items-end gap-3">
              <div className="flex flex-wrap gap-1">
                {(['7D', '30D', '3M', '6M', '1Y'] as Period[]).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={period === value ? 'secondary' : 'ghost'}
                    aria-pressed={period === value}
                    onClick={() => setPeriod(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <div>
                <label htmlFor="body-range-end" className="mb-1 block caption">
                  조회 기준일
                </label>
                <DatePicker
                  id="body-range-end"
                  value={end}
                  onChange={(e) => {
                    if (e.target.value) setEnd(e.target.value);
                  }}
                />
              </div>
            </div>
            {history.error && (
              <ErrorState message={history.error} retry={history.reload} />
            )}{' '}
            {history.loading && !history.data ? (
              <LoadingState />
            ) : (
              history.data && (
                <>
                  <p className="mb-5 text-sm text-muted-foreground">
                    최근 체중:{' '}
                    {history.data.current
                      ? `${history.data.current.weight}kg (${history.data.current.date})`
                      : '미기록'}{' '}
                    · 기간 변화:{' '}
                    {history.data.difference === null
                      ? '—'
                      : `${history.data.difference}kg`}
                  </p>
                  <TrendChart
                    title="체중과 7일 평균"
                    data={history.data.series.map((row) => ({
                      date: row.date,
                      weight: row.weight === null ? null : Number(row.weight),
                      average:
                        row.average === null
                          ? null
                          : Number(Number(row.average).toFixed(2)),
                    }))}
                    series={[
                      { key: 'weight', label: '체중 (kg)' },
                      { key: 'average', label: '7일 평균 (kg)' },
                    ]}
                  />
                  <p className="mt-3 caption">
                    평균은 최근 7개 달력일의 기록만 사용하며 미기록일은
                    제외합니다.
                  </p>
                </>
              )
            )}
          </CardContent>
        </Card>
      </div>
      <section className="mt-8">
        <h2 className="mb-4">측정 이력</h2>
        {history.data?.records.length ? (
          <div className="space-y-3">
            {[...history.data.records].reverse().map((record) => (
              <Card className="shadow-none" key={record.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3>
                      {record.date} · {record.weight} kg
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      체지방 {record.bodyFat ?? '—'}% · 근육{' '}
                      {record.muscleMass ?? '—'}kg · 허리 {record.waist ?? '—'}
                      cm
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (!confirmUnsavedForms()) return;
                        setDate(record.date);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      신체 기록 수정
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (!confirm(`${record.date} 신체 기록을 삭제할까요?`))
                          return;
                        try {
                          await api(`/body/${record.date}`, {
                            method: 'DELETE',
                          });
                          recordsChanged();
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-none">
            <EmptyState
              icon={<Scale />}
              title="첫 체중을 기록해보세요"
              description="체중만 입력해도 기록할 수 있어요."
            />
          </Card>
        )}
      </section>
    </main>
  );
}
