import { BodyPage } from '@/components/body/body-page';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  return <BodyPage initialDate={date} key={date} />;
}
