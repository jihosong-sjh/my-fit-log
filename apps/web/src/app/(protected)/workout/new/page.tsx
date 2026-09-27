import { NewWorkout } from '@/components/workout/new-workout';
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ routine?: string }>;
}) {
  const { routine } = await searchParams;
  return (
    <main id="main-content" className="page-content">
      <h1>운동 시작</h1>
      <p className="mt-3 text-muted-foreground">
        빈 운동이나 준비해둔 루틴으로 시작하세요.
      </p>
      <NewWorkout routineId={routine} />
    </main>
  );
}
