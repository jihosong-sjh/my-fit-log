import { DietPage } from '@/components/diet/diet-page';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <DietPage initialDate={date} key={date} />;
}
