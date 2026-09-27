import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@myfit/ui/card';
export function StatCard({
  title,
  value,
  unit,
  description,
  icon,
}: {
  title: string;
  value: string | null;
  unit?: string;
  description: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="gap-4 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span aria-hidden="true" className="text-muted-foreground">
          {icon}
        </span>
      </CardHeader>
      <CardContent>
        <p className="break-words text-[clamp(1.25rem,4vw,1.875rem)] font-semibold tabular-nums tracking-tight">
          {value ?? '—'}{' '}
          <span className="text-sm font-normal text-muted-foreground">
            {unit}
          </span>
        </p>
        <p className="mt-2 caption">{description}</p>
      </CardContent>
    </Card>
  );
}
export function ProgressCircle({
  value,
  label,
}: {
  value: number | null;
  label: string;
}) {
  const bounded = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative grid size-24 shrink-0 place-items-center"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value === null ? undefined : bounded}
      aria-valuetext={value === null ? '목표 미설정' : `${value}%`}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 100 100"
        className="absolute size-full -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="var(--brand)"
          strokeWidth="6"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${bounded} 100`}
        />
      </svg>
      <span className="text-xl font-semibold tabular-nums">
        {value === null ? '—' : `${value}%`}
      </span>
    </div>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center">
      {icon && (
        <span
          aria-hidden="true"
          className="mb-4 rounded-2xl bg-muted p-3 text-muted-foreground"
        >
          {icon}
        </span>
      )}
      <h3>{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
