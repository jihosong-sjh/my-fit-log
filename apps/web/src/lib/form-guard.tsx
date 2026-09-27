'use client';
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
let navigationApproved = false;
export const isNavigationApproved = () => navigationApproved;
export function confirmUnsavedForms() {
  return (
    !document.querySelector('form[data-dirty="true"]') ||
    confirm('저장하지 않은 입력이 있습니다. 변경사항을 버릴까요?')
  );
}
export function submitOnModEnter(event: KeyboardEvent<HTMLFormElement>) {
  if (
    event.currentTarget.contains(event.target as Node) &&
    (event.metaKey || event.ctrlKey) &&
    event.key === 'Enter'
  ) {
    event.preventDefault();
    event.currentTarget.requestSubmit();
  }
}
export function useFormGuard() {
  const [dirty, setDirty] = useState(false);
  return {
    dirty,
    markDirty: () => setDirty(true),
    markSaved: () => setDirty(false),
    props: {
      'data-dirty': dirty,
      onChangeCapture: (event: FormEvent<HTMLFormElement>) => {
        if (
          event.target instanceof Element &&
          event.target.closest('form') === event.currentTarget
        )
          setDirty(true);
      },
      onKeyDown: submitOnModEnter,
    },
  };
}
export function UnsavedNavigationGuard() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const unload = (event: BeforeUnloadEvent) => {
      if (
        !navigationApproved &&
        document.querySelector('form[data-dirty="true"]')
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor =
        event.target instanceof Element ? event.target.closest('a') : null;
      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      )
        return;
      const url = new URL(anchor.href, location.href);
      if (url.pathname === location.pathname && url.search === location.search)
        return;
      if (!document.querySelector('form[data-dirty="true"]')) return;
      if (!confirmUnsavedForms()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      navigationApproved = true;
      clearTimeout(timer);
      timer = setTimeout(() => {
        navigationApproved = false;
      }, 1000);
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => {
      clearTimeout(timer);
      navigationApproved = false;
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', click, true);
    };
  }, []);
  return null;
}
