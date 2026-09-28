'use client';
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { EmptyState } from '@myfit/ui/summary';
import { Skeleton } from '@myfit/ui/skeleton';
import type { TrendChart as Renderer } from './trend-chart-renderer';
const Chart = dynamic(
  () => import('./trend-chart-renderer').then((module) => module.TrendChart),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-80 w-full" aria-label="차트 불러오는 중" />
    ),
  },
);
export function TrendChart(props: ComponentProps<typeof Renderer>) {
  const hasData = props.data.some((row) =>
    props.series.some((series) => typeof row[series.key] === 'number'),
  );
  return (
    <div>
      {!hasData ? (
        <EmptyState
          title="아직 표시할 기록이 없어요"
          description="선택한 기간에 기록을 추가하면 변화를 볼 수 있어요."
        />
      ) : (
        <Chart {...props} />
      )}
    </div>
  );
}
