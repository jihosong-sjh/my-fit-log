'use client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { EmptyState } from '@myfit/ui/summary';
type Series = { key: string; label: string; color?: string };
export function TrendChart({
  data,
  series,
  title,
  kind = 'line',
}: {
  data: Record<string, string | number | null>[];
  series: Series[];
  title: string;
  kind?: 'line' | 'bar';
}) {
  if (!data.some((row) => series.some((s) => typeof row[s.key] === 'number')))
    return (
      <EmptyState
        title="아직 표시할 기록이 없어요"
        description="선택한 기간에 기록을 추가하면 변화를 볼 수 있어요."
      />
    );
  const axes = (
    <>
      <CartesianGrid stroke="var(--border)" vertical={false} />
      <XAxis
        dataKey="date"
        tickFormatter={(value) => String(value).slice(5)}
        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        minTickGap={24}
      />
      <YAxis
        width={44}
        tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        domain={kind === 'line' ? ['auto', 'auto'] : [0, 'auto']}
      />
      <Tooltip
        contentStyle={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'var(--foreground)',
        }}
      />
      <Legend />
    </>
  );
  return (
    <figure aria-label={title} className="min-w-0">
      <div className="h-64 min-w-0 w-full">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          initialDimension={{ width: 300, height: 256 }}
        >
          {kind === 'bar' ? (
            <BarChart data={data} accessibilityLayer>
              {axes}
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={
                    s.color ?? (i ? 'var(--muted-foreground)' : 'var(--brand)')
                  }
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                />
              ))}
            </BarChart>
          ) : (
            <LineChart data={data} accessibilityLayer>
              {axes}
              {series.map((s, i) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={
                    s.color ?? (i ? 'var(--muted-foreground)' : 'var(--brand)')
                  }
                  strokeWidth={2}
                  strokeDasharray={i ? '5 4' : undefined}
                  dot={{ r: 2 }}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer caption">{title} 표로 보기</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr>
                <th className="p-2">날짜</th>
                {series.map((s) => (
                  <th className="p-2" key={s.key}>
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr className="border-t" key={i}>
                  <td className="p-2">{row.date}</td>
                  {series.map((s) => (
                    <td className="p-2 tabular-nums" key={s.key}>
                      {row[s.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
