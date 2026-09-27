import type { WorkoutRecord, WorkoutPayload } from '@myfit/types';
export type SyncState = 'DIRTY' | 'SAVING' | 'SYNCED' | 'FAILED' | 'CONFLICT';
export type WorkoutDraft = {
  schemaVersion: 1;
  userId: string;
  workoutId: string;
  baseRevision: number | null;
  payload: WorkoutRecord;
  pendingMutationId: string | null;
  pendingPayload: WorkoutPayload | null;
  pendingVersion: number | null;
  localVersion: number;
  updatedAt: string;
  syncState: SyncState;
};
export interface DraftStorage {
  put(draft: WorkoutDraft): Promise<void>;
  remove(userId: string, workoutId: string): Promise<void>;
}
export function toPayload(
  record: WorkoutRecord,
  baseRevision: number | null,
  mutationId: string = crypto.randomUUID(),
): WorkoutPayload {
  return {
    baseRevision,
    mutationId,
    date: record.date,
    status: record.status,
    startedAt: record.startedAt,
    endedAt: record.endedAt,
    sourceRoutineId: record.sourceRoutineId,
    memo: record.memo,
    exercises: record.exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exerciseId,
      sets: e.sets.map((s) => ({
        id: s.id,
        weight: s.weight,
        reps: s.reps,
        rpe: s.rpe,
        completed: s.completed,
      })),
    })),
  };
}
export function makeDraft(userId: string, record: WorkoutRecord): WorkoutDraft {
  return {
    schemaVersion: 1,
    userId,
    workoutId: record.id,
    baseRevision: record.revision || null,
    payload: record,
    pendingMutationId: null,
    pendingPayload: null,
    pendingVersion: null,
    localVersion: 0,
    updatedAt: new Date().toISOString(),
    syncState: record.revision ? 'SYNCED' : 'DIRTY',
  };
}
export function validateDraft(
  value: unknown,
  userId: string,
  workoutId: string,
): WorkoutDraft {
  if (!value || typeof value !== 'object')
    throw new Error('기기 기록을 읽을 수 없습니다.');
  const row = value as WorkoutDraft;
  if (row.schemaVersion !== 1)
    throw new Error(
      '이 버전에서 읽을 수 없는 기기 기록입니다. 원본을 보존했습니다.',
    );
  if (
    row.userId !== userId ||
    row.workoutId !== workoutId ||
    row.payload?.id !== workoutId ||
    !Number.isInteger(row.localVersion) ||
    !['DIRTY', 'SAVING', 'SYNCED', 'FAILED', 'CONFLICT'].includes(
      row.syncState,
    ) ||
    !Array.isArray(row.payload?.exercises) ||
    !row.payload.exercises.every(
      (e) =>
        typeof e.id === 'string' &&
        typeof e.exerciseId === 'string' &&
        typeof e.exerciseNameSnapshot === 'string' &&
        Array.isArray(e.sets) &&
        e.sets.every(
          (s) =>
            typeof s.id === 'string' &&
            typeof s.weight === 'string' &&
            typeof s.completed === 'boolean',
        ),
    ) ||
    !(row.baseRevision === null || Number.isInteger(row.baseRevision)) ||
    row.pendingMutationId !== (row.pendingPayload?.mutationId ?? null)
  )
    throw new Error(
      '기기 기록 형식을 확인할 수 없습니다. 원본을 보존했습니다.',
    );
  return row;
}
