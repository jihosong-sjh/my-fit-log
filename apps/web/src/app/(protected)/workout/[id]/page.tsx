import { WorkoutEditor } from '@/components/workout/workout-editor';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkoutEditor id={id} key={id} />;
}
