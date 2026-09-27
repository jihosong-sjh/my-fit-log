export const numberText = (
  value: string | number | null | undefined,
  digits = 1,
) =>
  value === null || value === undefined
    ? '—'
    : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits });
export const minutesText = (seconds: number) =>
  `${Math.floor(seconds / 60)}분${seconds % 60 ? ` ${seconds % 60}초` : ''}`;
