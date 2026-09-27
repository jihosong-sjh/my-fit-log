'use client';
import { useState } from 'react';
import { localDate } from '@myfit/types';
import { toast } from 'sonner';
import { NumberInput } from '@myfit/ui/fields';
import { Button } from '@myfit/ui/button';
import { api, errorMessage, recordsChanged } from '@/lib/api';
export function QuickWeight({
  date = localDate(new Date()),
}: {
  date?: string;
}) {
  const [weight, setWeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await api(`/body/${date}`, { method: 'PUT', json: { weight } });
          setWeight('');
          recordsChanged();
          toast.success('체중을 저장했어요');
        } catch (error) {
          setError(errorMessage(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="quick-weight" className="mb-2 block font-medium">
        빠른 체중 기록 (kg)
      </label>
      <div className="flex gap-2">
        <NumberInput
          id="quick-weight"
          min="0.01"
          max="99999.99"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          required
          placeholder="오늘의 체중"
        />
        <Button disabled={busy} type="submit">
          체중 저장
        </Button>
      </div>
      <p className="mt-2 caption">
        {date} · 체중만 갱신하며 다른 신체 기록은 유지합니다.
      </p>
      {error && (
        <p className="mt-2 text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
