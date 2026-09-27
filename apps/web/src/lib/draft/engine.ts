import type { WorkoutPayload, WorkoutRecord } from '@myfit/types';
import { toPayload, type DraftStorage, type WorkoutDraft } from './model';
export type DraftSnapshot = {
  doc: WorkoutDraft;
  saving: boolean;
  storageError: string;
  error: string;
  httpStatus: number | null;
};
export type DraftTransport = (
  id: string,
  payload: WorkoutPayload,
  signal: AbortSignal,
) => Promise<WorkoutRecord>;
const STORAGE_ERROR =
  '이 기기에 임시 저장하지 못했어요. 입력은 현재 화면에 남아 있습니다. 다시 시도해주세요.';
const controllers = new Set<DraftController>();
export class DraftController {
  private state: DraftSnapshot;
  private listeners = new Set<() => void>();
  private tail: Promise<void> = Promise.resolve();
  private flight: Promise<boolean> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private abort: AbortController | null = null;
  private active = false;
  private generation = 0;
  constructor(
    doc: WorkoutDraft,
    private readonly storage: DraftStorage,
    private readonly transport: DraftTransport,
    private readonly onSaved: () => void = () => {},
    private readonly delay = 800,
  ) {
    this.state = {
      doc,
      saving: false,
      storageError: '',
      error:
        doc.syncState === 'CONFLICT'
          ? '서버 기록과 충돌했습니다. 기기 입력은 보존되어 있어요.'
          : '',
      httpStatus: null,
    };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private patch(next: Partial<DraftSnapshot>) {
    this.state = { ...this.state, ...next };
    for (const listener of this.listeners) listener();
  }
  private document(doc: WorkoutDraft, extra: Partial<DraftSnapshot> = {}) {
    this.patch({ doc, ...extra });
  }
  private persist(doc = this.state.doc): Promise<boolean> {
    const value = structuredClone(doc);
    const task = this.tail.then(() => this.storage.put(value));
    this.tail = task.catch(() => {});
    return task.then(
      () => {
        if (this.active) this.patch({ storageError: '' });
        return true;
      },
      () => {
        if (this.active) this.patch({ storageError: STORAGE_ERROR });
        return false;
      },
    );
  }
  async start() {
    this.active = true;
    this.generation++;
    controllers.add(this);
    const ok = await this.persist();
    if (
      ok &&
      this.active &&
      this.state.doc.syncState !== 'SYNCED' &&
      this.state.doc.syncState !== 'CONFLICT'
    )
      this.schedule(0);
  }
  async stop() {
    this.active = false;
    const generation = ++this.generation;
    if (this.timer) clearTimeout(this.timer);
    this.abort?.abort();
    await Promise.allSettled([this.tail, this.flight]);
    if (!this.active && generation === this.generation)
      controllers.delete(this);
  }
  private schedule(delay = this.delay) {
    if (this.timer) clearTimeout(this.timer);
    if (this.active)
      this.timer = setTimeout(() => {
        void this.sync();
      }, delay);
  }
  update(payload: WorkoutRecord) {
    if (!this.active) return;
    const doc = {
      ...this.state.doc,
      payload,
      localVersion: this.state.doc.localVersion + 1,
      updatedAt: new Date().toISOString(),
      syncState:
        this.state.doc.syncState === 'CONFLICT'
          ? ('CONFLICT' as const)
          : this.state.saving
            ? ('SAVING' as const)
            : ('DIRTY' as const),
    };
    this.document(doc, {
      error: doc.syncState === 'CONFLICT' ? this.state.error : '',
      httpStatus: doc.syncState === 'CONFLICT' ? this.state.httpStatus : null,
    });
    void this.persist(doc).then((ok) => {
      if (ok && doc.syncState !== 'CONFLICT') this.schedule();
    });
  }
  sync(): Promise<boolean> {
    if (this.timer) clearTimeout(this.timer);
    if (this.flight) return this.flight;
    if (!this.active) return Promise.resolve(false);
    this.patch({ saving: true });
    const generation = this.generation;
    this.flight = this.run(generation).finally(() => {
      this.flight = null;
      if (this.active && generation === this.generation)
        this.patch({ saving: false });
    });
    return this.flight;
  }
  private async run(generation: number): Promise<boolean> {
    while (this.active && generation === this.generation) {
      await this.tail;
      let doc = this.state.doc;
      if (doc.syncState === 'CONFLICT') return false;
      if (doc.syncState === 'SYNCED' && !doc.pendingPayload) {
        if (this.state.storageError) return this.persist();
        return true;
      }
      if (!doc.pendingPayload) {
        const pending = toPayload(doc.payload, doc.baseRevision);
        doc = {
          ...doc,
          pendingMutationId: pending.mutationId,
          pendingPayload: pending,
          pendingVersion: doc.localVersion,
        };
      }
      doc = { ...doc, syncState: 'SAVING' };
      this.document(doc, { error: '', httpStatus: null });
      if (!(await this.persist(doc))) {
        this.document({ ...this.state.doc, syncState: 'FAILED' });
        return false;
      }
      if (!this.active || generation !== this.generation) return false;
      const pending = doc.pendingPayload!;
      const pendingVersion = doc.pendingVersion;
      this.abort = new AbortController();
      try {
        const saved = await this.transport(
          doc.workoutId,
          pending,
          this.abort.signal,
        );
        if (!this.active || generation !== this.generation) return false;
        const current = this.state.doc;
        const changed = current.localVersion !== pendingVersion;
        const payload = changed
          ? { ...current.payload, revision: saved.revision }
          : {
              ...saved,
              exercises: current.payload.exercises.map((e) => ({
                ...e,
                exerciseNameSnapshot:
                  saved.exercises.find((row) => row.id === e.id)
                    ?.exerciseNameSnapshot ?? e.exerciseNameSnapshot,
              })),
            };
        const next: WorkoutDraft = {
          ...current,
          payload,
          baseRevision: saved.revision,
          pendingMutationId: null,
          pendingPayload: null,
          pendingVersion: null,
          syncState: changed ? 'DIRTY' : 'SYNCED',
          updatedAt: new Date().toISOString(),
        };
        this.document(next, { error: '', httpStatus: null });
        if (!changed && saved.status === 'COMPLETED') {
          const cleanup = this.tail.then(async () => {
            if (this.state.doc.localVersion === pendingVersion)
              await this.storage.remove(doc.userId, doc.workoutId);
          });
          this.tail = cleanup.catch(() => {});
          try {
            await cleanup;
            this.patch({ storageError: '' });
          } catch {
            this.patch({
              storageError:
                '서버 저장은 완료했지만 기기 기록을 정리하지 못했어요. 다시 시도해주세요.',
            });
          }
        } else await this.persist(next);
        this.onSaved();
        if (
          this.state.doc.localVersion === pendingVersion &&
          this.state.doc.syncState === 'SYNCED'
        )
          return true;
      } catch (error) {
        if (!this.active || generation !== this.generation) return false;
        const status =
          typeof error === 'object' &&
          error !== null &&
          'status' in error &&
          typeof error.status === 'number'
            ? error.status
            : null;
        const conflict = status === 409 || status === 404;
        const message =
          status === 401
            ? '로그인이 만료됐어요. 기기 입력을 보존했으니 다시 로그인해주세요.'
            : status === 404
              ? '서버에서 삭제된 운동입니다. 기기 입력을 보존했으며 자동으로 다시 만들지 않습니다.'
              : status === 409
                ? '다른 곳에서 운동을 수정했어요. 기기 입력을 확인하고 서버 기록과 비교해주세요.'
                : status === 400
                  ? '입력값을 확인해주세요. 기기 입력은 보존되어 있어요.'
                  : '서버에 저장하지 못했어요. 기기 입력을 보존했으니 연결 후 다시 시도해주세요.';
        const current = this.state.doc;
        const next: WorkoutDraft = {
          ...current,
          syncState: conflict ? 'CONFLICT' : 'FAILED',
          ...(status === 400
            ? {
                pendingMutationId: null,
                pendingPayload: null,
                pendingVersion: null,
              }
            : {}),
        };
        this.document(next, { error: message, httpStatus: status });
        await this.persist(next);
        return false;
      }
    }
    return false;
  }
  async retry() {
    if (
      this.state.doc.syncState === 'SYNCED' &&
      this.state.doc.payload.status === 'COMPLETED'
    ) {
      try {
        await this.tail;
        await this.storage.remove(
          this.state.doc.userId,
          this.state.doc.workoutId,
        );
        this.patch({ storageError: '' });
        return true;
      } catch {
        this.patch({ storageError: STORAGE_ERROR });
        return false;
      }
    }
    if (!(await this.persist())) return false;
    return this.sync();
  }
  async resolve(server: WorkoutRecord, keepLocal: boolean) {
    if (this.flight) await this.flight;
    const current = this.state.doc;
    const payload = keepLocal
      ? { ...current.payload, revision: server.revision }
      : server;
    const doc: WorkoutDraft = {
      ...current,
      payload,
      baseRevision: server.revision,
      pendingMutationId: null,
      pendingPayload: null,
      pendingVersion: null,
      localVersion: current.localVersion + 1,
      syncState: keepLocal ? 'DIRTY' : 'SYNCED',
      updatedAt: new Date().toISOString(),
    };
    this.document(doc, { error: '', httpStatus: null });
    await this.persist(doc);
    if (keepLocal) this.schedule(0);
  }
  async discard() {
    await this.stop();
    await this.storage.remove(this.state.doc.userId, this.state.doc.workoutId);
  }
}
export function hasActiveUnsynced(userId: string) {
  return [...controllers].some((store) => {
    const state = store.getSnapshot();
    return (
      state.doc.userId === userId &&
      (state.doc.syncState !== 'SYNCED' || !!state.storageError)
    );
  });
}
export async function stopAccountDrafts(userId: string) {
  await Promise.all(
    [...controllers]
      .filter((store) => store.getSnapshot().doc.userId === userId)
      .map((store) => store.stop()),
  );
}
