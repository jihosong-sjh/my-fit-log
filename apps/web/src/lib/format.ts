export const numberText = (
  value: string | number | null | undefined,
  digits = 1,
) =>
  value === null || value === undefined
    ? '—'
    : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits });
export const minutesText = (seconds: number) =>
  `${Math.floor(seconds / 60)}분${seconds % 60 ? ` ${seconds % 60}초` : ''}`;
export function paceText(value: string | null) {
  if (value === null) return '—';
  const seconds = Math.round(Number(value));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
