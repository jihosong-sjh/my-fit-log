import { validateDraft, type WorkoutDraft, type DraftStorage } from './model';
const DATABASE = 'myfit-workout-drafts';
const STORE = 'workouts';
const key = (userId: string, workoutId: string) => `${userId}:${workoutId}`;
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('이 브라우저에서 임시 저장을 사용할 수 없습니다.'));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE, { keyPath: 'key' });
    };
    request.onblocked = () =>
      reject(new Error('다른 탭의 임시 저장을 닫고 다시 시도해주세요.'));
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      let value: T;
      request.onsuccess = () => {
        value = request.result;
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () =>
        reject(tx.error ?? new Error('임시 저장이 중단되었습니다.'));
    });
  } finally {
    db.close();
  }
}
function changed() {
  if (typeof window !== 'undefined')
    window.dispatchEvent(new Event('myfit:drafts-changed'));
}
export const draftStorage: DraftStorage = {
  async put(draft) {
    await transaction('readwrite', (store) =>
      store.put({ ...draft, key: key(draft.userId, draft.workoutId) }),
    );
    changed();
  },
  async remove(userId, workoutId) {
    await transaction('readwrite', (store) =>
      store.delete(key(userId, workoutId)),
    );
    changed();
  },
};
export async function readDraft(userId: string, workoutId: string) {
  const value: unknown = await transaction('readonly', (store) =>
    store.get(key(userId, workoutId)),
  );
  return value === undefined ? null : validateDraft(value, userId, workoutId);
}
export async function listDrafts(userId: string): Promise<WorkoutDraft[]> {
  const rows: unknown[] = await transaction('readonly', (store) =>
    store.getAll(),
  );
  return rows
    .filter(
      (row): row is WorkoutDraft & { key: string } =>
        !!row &&
        typeof row === 'object' &&
        'key' in row &&
        typeof row.key === 'string' &&
        row.key.startsWith(`${userId}:`),
    )
    .map((row) => validateDraft(row, userId, row.key.slice(userId.length + 1)));
}
export async function clearDrafts(userId: string) {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const request = tx
        .objectStore(STORE)
        .openCursor(IDBKeyRange.bound(`${userId}:`, `${userId}:\uffff`));
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    changed();
  } finally {
    db.close();
  }
}
const fresh = new Set<string>();
export function markFreshDraft(id: string) {
  fresh.add(id);
}
export function consumeFreshDraft(id: string) {
  const value = fresh.has(id);
  fresh.delete(id);
  return value;
}
