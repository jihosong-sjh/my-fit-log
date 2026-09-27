import { MealEditor } from '@/components/diet/meal-editor';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <MealEditor id={(await params).id} />;
}
