export type BodyRecord = {
  id: string;
  date: string;
  weight: string;
  bodyFat: string | null;
  muscleMass: string | null;
  waist: string | null;
  memo: string | null;
  updatedAt: string;
};
export type BodyHistory = {
  from: string;
  to: string;
  records: BodyRecord[];
  series: { date: string; weight: string | null; average: string | null }[];
  current: BodyRecord | null;
  difference: string | null;
};
