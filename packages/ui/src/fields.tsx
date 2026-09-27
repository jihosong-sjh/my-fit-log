'use client';
import type { ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@myfit/ui/input';
import { cn } from '@myfit/ui/utils';
export function NumberInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'>) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="0.01"
      className={cn('tabular-nums', className)}
      {...props}
    />
  );
}
export function SearchInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'>) {
  return (
    <div className="relative">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
      />
      <Input type="search" className={cn('pl-10', className)} {...props} />
    </div>
  );
}
export function DatePicker(props: Omit<ComponentProps<typeof Input>, 'type'>) {
  return <Input type="date" {...props} />;
}
