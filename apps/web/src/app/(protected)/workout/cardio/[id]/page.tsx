import { CardioForm } from '@/components/workout/cardio-form';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <CardioForm id={(await params).id} />;
}
