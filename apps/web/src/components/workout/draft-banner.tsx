'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@myfit/ui/button';
import { Card, CardContent } from '@myfit/ui/card';
import { useUser } from '../auth-context';
import { draftStorage, listDrafts, markFreshDraft } from '@/lib/draft/storage';
import type { WorkoutDraft } from '@/lib/draft/model';
export function DraftBanner() {
  const user = useUser();
  const [drafts, setDrafts] = useState<WorkoutDraft[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = () => {
      void listDrafts(user.id).then(
        (rows) => {
          if (active) {
            setDrafts(
              rows.filter(
                (d) =>
                  d.payload.status === 'IN_PROGRESS' ||
                  d.syncState !== 'SYNCED',
              ),
            );
            setError('');
          }
        },
        () => {
          if (active)
            setError(
              '기기의 운동 임시 기록을 읽지 못했어요. 기기 저장 권한을 확인해주세요.',
            );
        },
      );
    };
    load();
    window.addEventListener('myfit:drafts-changed', load);
    return () => {
      active = false;
      window.removeEventListener('myfit:drafts-changed', load);
    };
  }, [user]);
  if (!drafts.length && !error) return null;
  return (
    <Card className="mb-6 border-brand/30 shadow-none">
      <CardContent>
        <h2 className="text-lg">작성 중인 운동 기록이 있습니다</h2>
        {error && (
          <p role="alert" className="mt-2 text-danger">
            {error}
          </p>
        )}
        <ul className="mt-3 space-y-3">
          {drafts.map((d) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2"
              key={d.workoutId}
            >
              <span>
                {d.payload.date} ·{' '}
                {d.payload.exercises
                  .map((e) => e.exerciseNameSnapshot)
                  .join(', ') || '새 운동'}{' '}
                ·{' '}
                {d.syncState === 'SYNCED' ? '서버 저장됨' : '기기 입력 보존됨'}
              </span>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link
                    href={`/workout/${d.workoutId}`}
                    onClick={() => markFreshDraft(d.workoutId)}
                  >
                    기록 복구
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (
                      confirm(
                        '기기에 남은 입력을 폐기할까요? 서버 기록은 유지됩니다.',
                      )
                    ) {
                      try {
                        await draftStorage.remove(d.userId, d.workoutId);
                      } catch {
                        setError(
                          '기기 기록을 지우지 못했어요. 다시 시도해주세요.',
                        );
                      }
                    }
                  }}
                >
                  기기 기록 폐기
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
