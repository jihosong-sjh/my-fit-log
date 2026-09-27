import { WorkoutEditor } from '@/components/workout/workout-editor';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <WorkoutEditor id={(await params).id} />;
}
