'use client';
import { useState } from 'react';
import { Star, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { UNIT_LABELS, type FoodOption, type ServingUnit } from '@myfit/types';
import { Button } from '@myfit/ui/button';
import { Input } from '@myfit/ui/input';
import { NumberInput, SearchInput } from '@myfit/ui/fields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@myfit/ui/dialog';
import { useResource } from '@/lib/use-resource';
import { api, errorMessage, recordsChanged } from '@/lib/api';
import { useUser } from '../auth-context';
import { ErrorState, LoadingState } from '../resource-state';
function FoodEditor({
  initial,
  onSaved,
}: {
  initial: FoodOption | null;
  onSaved: (food: FoodOption) => void;
}) {
  const [value, setValue] = useState({
    name: initial?.name ?? '',
    servingSize: initial?.servingSize ?? '100',
    servingUnit: initial?.servingUnit ?? ('G' as ServingUnit),
    calories: initial?.calories ?? '0',
    protein: initial?.protein ?? '0',
    carbs: initial?.carbs ?? '0',
    fat: initial?.fat ?? '0',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-4 rounded-xl border p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const food = await api<FoodOption>(
            initial ? `/foods/${initial.id}` : '/foods',
            { method: initial ? 'PUT' : 'POST', json: value },
          );
          recordsChanged();
          onSaved(food);
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{initial ? '음식 정보 수정' : '직접 음식 추가'}</h3>
      <p className="caption">수정한 영양정보는 새 식사부터 반영됩니다.</p>
      <div>
        <label htmlFor="food-name" className="mb-1 block">
          음식 이름
        </label>
        <Input
          id="food-name"
          value={value.name}
          onChange={(e) => setValue({ ...value, name: e.target.value })}
          required
          maxLength={100}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="serving-size" className="mb-1 block">
            1회 제공량
          </label>
          <NumberInput
            id="serving-size"
            value={value.servingSize}
            onChange={(e) =>
              setValue({ ...value, servingSize: e.target.value })
            }
            min="0.001"
            max="9999999.999"
            step="0.001"
            required
          />
        </div>
        <div>
          <label htmlFor="serving-unit" className="mb-1 block">
            제공량 단위
          </label>
          <select
            id="serving-unit"
            value={value.servingUnit}
            onChange={(e) =>
              setValue({ ...value, servingUnit: e.target.value as ServingUnit })
            }
            className="h-11 w-full rounded-md border bg-surface px-3"
          >
            {Object.entries(UNIT_LABELS).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ['calories', '열량 (kcal)'],
            ['protein', '단백질 (g)'],
            ['carbs', '탄수화물 (g)'],
            ['fat', '지방 (g)'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`food-${key}`} className="mb-1 block">
              {label}
            </label>
            <NumberInput
              id={`food-${key}`}
              value={value[key]}
              onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              min="0"
              max="99999999.99"
              required
            />
          </div>
        ))}
      </div>
      <p className="caption">모든 영양값은 위의 1회 제공량 기준입니다.</p>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        음식 정보 저장
      </Button>
    </form>
  );
}
export function FoodPicker({
  onSelect,
  label = '음식 추가',
}: {
  onSelect: (food: FoodOption) => void;
  label?: string;
}) {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [favorite, setFavorite] = useState(false);
  const [editing, setEditing] = useState<FoodOption | null | undefined>();
  const { data, error, loading, reload } = useResource<FoodOption[]>(
    open
      ? `/foods?search=${encodeURIComponent(search)}&sort=${sort}&favorite=${favorite}`
      : null,
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) setEditing(undefined);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          <Plus aria-hidden="true" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>음식 선택</DialogTitle>
          <DialogDescription>
            1회 제공량과 영양정보를 확인하고 추가하세요.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor="food-search" className="sr-only">
          음식 검색
        </label>
        <SearchInput
          id="food-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="음식 이름 검색"
        />
        <div className="flex flex-wrap gap-2">
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
            aria-label="음식 정렬"
            className="rounded-md border bg-surface px-2"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">최근순</option>
            <option value="frequent">자주 먹는 순</option>
            <option value="name">이름순</option>
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditing(null)}
          >
            음식 만들기
          </Button>
        </div>
        {error && <ErrorState message={error} retry={reload} />}{' '}
        {loading && !data ? (
          <LoadingState />
        ) : (
          <ul className="max-h-64 divide-y overflow-y-auto">
            {data?.map((food) => (
              <li
                key={food.id}
                className="flex flex-wrap items-center gap-1 py-2"
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto min-h-11 min-w-0 flex-1 flex-col items-start whitespace-normal text-left"
                  onClick={() => {
                    onSelect(food);
                    setOpen(false);
                  }}
                >
                  <span>{food.name}</span>
                  <span className="caption">
                    {food.servingSize}
                    {UNIT_LABELS[food.servingUnit]} · {food.calories} kcal
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`${food.name} 즐겨찾기 ${food.favorite ? '해제' : '등록'}`}
                  onClick={async () => {
                    try {
                      await api(`/foods/${food.id}/favorite`, {
                        method: food.favorite ? 'DELETE' : 'POST',
                      });
                      recordsChanged();
                    } catch (e) {
                      toast.error(errorMessage(e));
                    }
                  }}
                >
                  <Star
                    aria-hidden="true"
                    className={food.favorite ? 'fill-warning text-warning' : ''}
                  />
                </Button>
                {food.ownerId === user?.id && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${food.name} 정보 수정`}
                      onClick={() => setEditing(food)}
                    >
                      <Pencil aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`${food.name} 보관`}
                      onClick={async () => {
                        if (
                          !confirm(
                            '음식을 보관할까요? 기존 식사 기록은 유지됩니다.',
                          )
                        )
                          return;
                        try {
                          await api(`/foods/${food.id}`, { method: 'DELETE' });
                          recordsChanged();
                        } catch (e) {
                          toast.error(errorMessage(e));
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        {data?.length === 0 && (
          <p className="text-muted-foreground">
            음식이 없어요. 직접 음식 정보를 추가해보세요.
          </p>
        )}
        {editing !== undefined && (
          <FoodEditor
            key={editing?.id ?? 'new'}
            initial={editing}
            onSaved={(food) => {
              onSelect(food);
              setOpen(false);
              setEditing(undefined);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
