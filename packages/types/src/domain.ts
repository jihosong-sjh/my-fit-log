import Decimal from 'decimal.js';
Decimal.set({ precision: 40 });
export { Decimal };
export const TIME_ZONE = 'Asia/Seoul';
export const UNITS = {
  weight: 'kg',
  waist: 'cm',
  distance: 'km',
  duration: 'seconds',
  nutrition: 'g',
  energy: 'kcal',
} as const;
export type DecimalString = string;
export function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number(value.slice(0, 4)) < 1)
    throw new Error('Expected YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new Error('Invalid calendar date');
  return date;
}
export function localDate(instant: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}
export function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function weekStart(value: string): string {
  const date = parseDate(value);
  return addDays(value, -((date.getUTCDay() + 6) % 7));
}
export function decimal(value: string): Decimal {
  if (!/^-?\d+(\.\d+)?$/.test(value))
    throw new Error('Expected decimal string');
  const result = new Decimal(value);
  if (!result.isFinite()) throw new Error('Expected finite decimal');
  return result;
}
export function sum(values: string[]): string {
  return values.reduce((a, b) => a.plus(decimal(b)), new Decimal(0)).toFixed();
}
export function average(values: string[]): string | null {
  return values.length
    ? decimal(sum(values)).div(values.length).toFixed()
    : null;
}
export function goalPercentage(
  actual: string,
  goal: string | null,
): string | null {
  return goal === null
    ? null
    : decimal(goal).gt(0)
      ? decimal(actual).div(goal).mul(100).toFixed()
      : null;
}
export function completedVolume(
  sets: { weight: string; reps: number | null; completed: boolean }[],
): string {
  return sum(
    sets
      .filter((s) => s.completed && s.reps !== null)
      .map((s) => decimal(s.weight).mul(s.reps!).toFixed()),
  );
}
export function movingAverage(
  records: { date: string; weight: string }[],
  end: string,
): string | null {
  const start = addDays(end, -6);
  return average(
    records
      .filter((r) => r.date >= start && r.date <= end)
      .map((r) => r.weight),
  );
}
export function workoutDays(
  completedWorkoutDates: string[],
  cardioDates: string[],
  from: string,
  to: string,
): number {
  return new Set(
    [...completedWorkoutDates, ...cardioDates].filter(
      (d) => d >= from && d <= to,
    ),
  ).size;
}
export function pace(
  durationSeconds: number,
  distanceKm: string | null,
): string | null {
  return distanceKm !== null && decimal(distanceKm).gt(0)
    ? new Decimal(durationSeconds).div(distanceKm).toFixed()
    : null;
}
export function nutritionTotal(
  rows: {
    caloriesSnapshot: string;
    proteinSnapshot: string;
    carbsSnapshot: string;
    fatSnapshot: string;
    servings: string;
  }[],
) {
  const keys = ['calories', 'protein', 'carbs', 'fat'] as const;
  return Object.fromEntries(
    keys.map((key) => [
      key,
      sum(
        rows.map((row) =>
          decimal(row[`${key}Snapshot`]).mul(decimal(row.servings)).toFixed(),
        ),
      ),
    ]),
  ) as Record<(typeof keys)[number], string>;
}
export type Period = '7D' | '30D' | '3M' | '6M' | '1Y';
export function periodStart(end: string, period: Period): string {
  if (period === '7D' || period === '30D')
    return addDays(end, period === '7D' ? -6 : -29);
  const date = parseDate(end);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(
    date.getUTCMonth() - (period === '3M' ? 3 : period === '6M' ? 6 : 12),
  );
  const last = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.toISOString().slice(0, 10);
}
