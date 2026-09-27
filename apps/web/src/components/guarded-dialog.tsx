'use client';
import { useRef, type ComponentProps } from 'react';
import { DialogContent } from '@myfit/ui/dialog';
export function GuardedDialogContent({
  onEscapeKeyDown,
  onInteractOutside,
  onClickCapture,
  ...props
}: ComponentProps<typeof DialogContent>) {
  const ref = useRef<HTMLDivElement>(null);
  const canClose = () =>
    !ref.current?.querySelector('form[data-dirty="true"]') ||
    confirm('저장하지 않은 입력이 있습니다. 변경사항을 버리고 닫을까요?');
  return (
    <DialogContent
      {...props}
      ref={ref}
      onEscapeKeyDown={(event) => {
        if (!event.defaultPrevented && !canClose()) event.preventDefault();
        onEscapeKeyDown?.(event);
      }}
      onInteractOutside={(event) => {
        if (!canClose()) event.preventDefault();
        onInteractOutside?.(event);
      }}
      onClickCapture={(event) => {
        if (
          event.target instanceof Element &&
          event.target.closest('[data-slot="dialog-close"]') &&
          !canClose()
        ) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        onClickCapture?.(event);
      }}
    />
  );
}
