'use client';
import { GuardedDialogContent } from '@/components/guarded-dialog';
import { useFormGuard } from '@/lib/form-guard';
import { useRef, useState } from 'react';
import { Star, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ExerciseOption } from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { Input } from '@myfit/ui/input';
import { SearchInput } from '@myfit/ui/fields';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@myfit/ui/dialog';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useResource } from '@/lib/use-resource';
import { useUser } from '../auth-context';
import { ErrorState, LoadingState } from '../resource-state';
export function ExercisePicker({
  type = 'STRENGTH',
  onSelect,
  onAfterSelect,
}: {
  type?: 'STRENGTH' | 'CARDIO';
  onSelect: (exercise: ExerciseOption) => void | Promise<void>;
  onAfterSelect?: () => void;
}) {
  const guard = useFormGuard();
  const selected = useRef(false);
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [favorite, setFavorite] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState('DURATION');
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useResource<ExerciseOption[]>(
    open
      ? `/exercises?trackingType=${type}&search=${encodeURIComponent(search)}&sort=${sort}&favorite=${favorite}`
      : null,
  );
  const select = async (exercise: ExerciseOption) => {
    setBusy(true);
    try {
      await onSelect(exercise);
      selected.current = true;
      setOpen(false);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) selected.current = false;
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Plus aria-hidden="true" />
          종목 선택
        </Button>
      </DialogTrigger>
      <GuardedDialogContent
        onCloseAutoFocus={(event) => {
          if (selected.current && onAfterSelect) {
            event.preventDefault();
            requestAnimationFrame(onAfterSelect);
          }
        }}
        className="max-h-[85dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>운동 종목 선택</DialogTitle>
          <DialogDescription>
            {type === 'STRENGTH'
              ? '웨이트 운동을 검색하거나 직접 추가하세요.'
              : '유산소 운동의 입력 방식을 확인하고 선택하세요.'}
          </DialogDescription>
        </DialogHeader>
        <label htmlFor="exercise-search" className="sr-only">
          종목 검색
        </label>
        <SearchInput
          id="exercise-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="운동 이름 검색"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={favorite ? 'secondary' : 'outline'}
            aria-pressed={favorite}
            onClick={() => setFavorite(!favorite)}
          >
            즐겨찾기만
          </Button>
          <select
            aria-label="종목 정렬"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border bg-surface px-2"
          >
            <option value="name">이름순</option>
            <option value="recent">최근 사용순</option>
          </select>
        </div>
        {error && <ErrorState message={error} retry={reload} />}{' '}
        {loading && !data ? (
          <LoadingState />
        ) : (
          <ul className="max-h-64 overflow-y-auto divide-y">
            {data?.map((exercise) => (
              <li key={exercise.id} className="flex items-center gap-1 py-1">
                <Button
                  type="button"
                  variant="ghost"
                  className="min-w-0 flex-1 justify-start whitespace-normal text-left"
                  disabled={busy}
                  onClick={() => void select(exercise)}
                >
                  {exercise.name}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${exercise.name} 즐겨찾기 ${exercise.favorite ? '해제' : '등록'}`}
                  onClick={async () => {
                    try {
                      await api(`/exercises/${exercise.id}/favorite`, {
                        method: exercise.favorite ? 'DELETE' : 'POST',
                      });
                      recordsChanged();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                >
                  <Star
                    className={
                      exercise.favorite ? 'fill-warning text-warning' : ''
                    }
                    aria-hidden="true"
                  />
                </Button>
                {exercise.ownerId === user?.id && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`${exercise.name} 보관`}
                    onClick={async () => {
                      if (
                        !confirm(
                          '이 종목을 보관할까요? 과거 기록은 유지됩니다.',
                        )
                      )
                        return;
                      try {
                        await api(`/exercises/${exercise.id}`, {
                          method: 'DELETE',
                        });
                        recordsChanged();
                      } catch (e) {
                        toast.error(errorMessage(e));
                      }
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {data?.length === 0 && (
          <p className="py-3 text-muted-foreground">
            검색 결과가 없어요. 다른 이름으로 검색하거나 직접 추가하세요.
          </p>
        )}
        <details className="border-t pt-4">
          <summary className="cursor-pointer font-medium">
            직접 종목 추가
          </summary>
          <form
            {...guard.props}
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const created = await api<ExerciseOption>('/exercises', {
                  method: 'POST',
                  json: {
                    name,
                    trackingType: type,
                    cardioInputMode: type === 'CARDIO' ? mode : null,
                  },
                });
                recordsChanged();
                guard.markSaved();
                await select(created);
                setName('');
              } catch (error) {
                toast.error(errorMessage(error));
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="custom-exercise">종목 이름</label>
            <Input
              id="custom-exercise"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
            {type === 'CARDIO' && (
              <>
                <label htmlFor="cardio-mode">입력 방식</label>
                <select
                  id="cardio-mode"
                  className="h-11 w-full rounded-md border bg-surface px-3"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="DURATION">시간만</option>
                  <option value="DISTANCE">시간과 거리</option>
                  <option value="REPETITIONS">시간과 횟수</option>
                </select>
              </>
            )}
            <Button type="submit" disabled={busy}>
              종목 만들기
            </Button>
          </form>
        </details>
      </GuardedDialogContent>
    </Dialog>
  );
}
