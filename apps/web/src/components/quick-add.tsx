'use client';
import Link from 'next/link';
import { Activity, Dumbbell, Utensils, Scale, Plus } from 'lucide-react';
import { Button } from '@myfit/ui/button';
import { BottomSheet } from '@myfit/ui/bottom-sheet';
import { SheetClose } from '@myfit/ui/sheet';
export function QuickAdd({ mobile = false }: { mobile?: boolean }) {
  return (
    <BottomSheet
      title="빠른 기록"
      description="남길 기록을 선택해주세요."
      trigger={
        <Button
          aria-label="빠른 기록"
          className={
            mobile
              ? 'size-12 -translate-y-3 rounded-full bg-brand text-white shadow-md hover:bg-brand/90'
              : 'bg-brand text-white hover:bg-brand/90'
          }
        >
          <Plus aria-hidden="true" />
          {!mobile && '빠른 기록'}
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        {[
          { name: '웨이트', icon: Dumbbell, href: '/workout/new' },
          { name: '식단', icon: Utensils, href: '/diet/new' },
          { name: '체중', icon: Scale, href: '/body?quick=1' },
          { name: '유산소', icon: Activity, href: '/workout/cardio/new' },
        ].map(({ name, icon: Icon, href }) => (
          <SheetClose asChild key={name}>
            <Button asChild variant="outline" className="h-24 flex-col">
              <Link href={href}>
                <Icon aria-hidden="true" className="size-6" />
                {name}
              </Link>
            </Button>
          </SheetClose>
        ))}
      </div>
    </BottomSheet>
  );
}
