import { ComponentGallery } from '@/components/component-gallery';
export const metadata = { title: '컴포넌트 가이드' };
export default function DesignSystemPage() {
  return (
    <main id="main-content" className="page-content">
      <div className="mb-8">
        <p className="mb-2 text-sm text-muted-foreground">MyFit Log UI</p>
        <h1>컴포넌트 가이드</h1>
        <p className="mt-3 text-muted-foreground">
          입력과 상태를 확인하는 예제입니다. 실제 기록은 저장하지 않습니다.
        </p>
      </div>
      <ComponentGallery />
    </main>
  );
}
