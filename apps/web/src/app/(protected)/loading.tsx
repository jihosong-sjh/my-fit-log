import { LoadingState } from '@/components/resource-state';
export default function Loading() {
  return (
    <main id="main-content" tabIndex={-1} className="page-content min-h-[60vh]">
      <LoadingState />
    </main>
  );
}
