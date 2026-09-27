import { BodyPage } from '@/components/body/body-page';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; quick?: string }>;
}) {
  const { date, quick } = await searchParams;
  return (
    <BodyPage
      initialDate={date}
      quick={quick === '1'}
      key={`${date ?? ''}-${quick ?? ''}`}
    />
  );
}
