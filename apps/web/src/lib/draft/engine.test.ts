import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { WorkoutRecord, WorkoutPayload } from '@myfit/types';
import { DraftController } from './engine';
import { makeDraft, type WorkoutDraft, type DraftStorage } from './model';
const record = (): WorkoutRecord => ({
  id: crypto.randomUUID(),
  revision: 1,
  date: '2026-09-27',
  status: 'IN_PROGRESS',
  startedAt: '2026-09-27T01:00:00Z',
  endedAt: null,
  durationSeconds: null,
  sourceRoutineId: null,
  memo: null,
  totalSets: 0,
  volume: '0',
  exercises: [],
});
function storage() {
  const rows = new Map<string, WorkoutDraft>();
  let failing = false;
  const store: DraftStorage = {
    async put(doc) {
      if (failing) throw new Error('quota');
      rows.set(doc.workoutId, structuredClone(doc));
    },
    async remove(_user, id) {
      rows.delete(id);
    },
  };
  return {
    rows,
    store,
    fail: (value: boolean) => {
      failing = value;
    },
  };
}
const status = (code: number) =>
  Object.assign(new Error('request failed'), { status: code });
test('lost response retries exact frozen mutation and keeps edits made while request is in flight', async () => {
  const db = storage();
  const original = record();
  const calls: WorkoutPayload[] = [];
  let release: (row: WorkoutRecord) => void = () => {};
  let attempt = 0;
  const engine = new DraftController(
    makeDraft('user-a', original),
    db.store,
    async (_id, payload) => {
      calls.push(structuredClone(payload));
      attempt++;
      if (attempt === 1) throw new Error('response lost');
      if (attempt === 2)
        return new Promise((resolve) => {
          release = resolve;
        });
      return { ...original, revision: 3, memo: payload.memo };
    },
    () => {},
    100000,
  );
  await engine.start();
  engine.update({ ...original, memo: 'first' });
  assert.equal(await engine.sync(), false);
  const retry = engine.sync();
  await new Promise((resolve) => setTimeout(resolve, 5));
  engine.update({ ...original, memo: 'second' });
  release({ ...original, revision: 2, memo: 'first' });
  assert.equal(await retry, true);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[2]!.baseRevision, 2);
  assert.equal(calls[2]!.memo, 'second');
  assert.notEqual(calls[2]!.mutationId, calls[1]!.mutationId);
  assert.equal(engine.getSnapshot().doc.payload.memo, 'second');
  assert.equal(engine.getSnapshot().doc.syncState, 'SYNCED');
  await engine.stop();
});
test('401/404/409 preserve input, deletion never changes baseRevision to null', async () => {
  for (const code of [401, 404, 409]) {
    const db = storage();
    const initial = record();
    const engine = new DraftController(
      makeDraft('user-a', initial),
      db.store,
      async () => {
        throw status(code);
      },
      () => {},
      100000,
    );
    await engine.start();
    engine.update({ ...initial, memo: 'keep' });
    await engine.sync();
    assert.equal(engine.getSnapshot().doc.payload.memo, 'keep');
    assert.equal(engine.getSnapshot().doc.baseRevision, 1);
    assert.equal(engine.getSnapshot().httpStatus, code);
    assert.equal(
      engine.getSnapshot().doc.syncState,
      code === 401 ? 'FAILED' : 'CONFLICT',
    );
    assert.ok(db.rows.get(initial.id)?.pendingPayload);
    await engine.stop();
  }
});
test('storage failure prevents a false saved state and server send; retry preserves values', async () => {
  const db = storage();
  const initial = record();
  let calls = 0;
  const engine = new DraftController(
    makeDraft('user-a', initial),
    db.store,
    async (_id, payload) => {
      calls++;
      return { ...initial, revision: 2, memo: payload.memo };
    },
    () => {},
    100000,
  );
  await engine.start();
  db.fail(true);
  engine.update({ ...initial, memo: 'unsaved on device' });
  assert.equal(await engine.sync(), false);
  assert.equal(calls, 0);
  assert.ok(engine.getSnapshot().storageError);
  db.fail(false);
  assert.equal(await engine.retry(), true);
  assert.equal(calls, 1);
  assert.equal(engine.getSnapshot().doc.payload.memo, 'unsaved on device');
  await engine.stop();
});
test('completed draft is removed only after acknowledged retry; rejected validation permits corrected payload', async () => {
  const db = storage();
  const initial = record();
  let attempts = 0;
  const engine = new DraftController(
    makeDraft('user-a', initial),
    db.store,
    async (_id, payload) => {
      attempts++;
      if (attempts === 1) throw status(400);
      if (attempts === 2) throw new Error('lost');
      return {
        ...initial,
        revision: 2,
        status: payload.status,
        endedAt: payload.endedAt,
      };
    },
    () => {},
    100000,
  );
  await engine.start();
  engine.update({ ...initial, memo: 'invalid' });
  await engine.sync();
  assert.equal(engine.getSnapshot().doc.pendingPayload, null);
  engine.update({
    ...initial,
    status: 'COMPLETED',
    endedAt: '2026-09-27T02:00:00Z',
  });
  await engine.sync();
  assert.ok(db.rows.has(initial.id));
  await engine.retry();
  assert.equal(db.rows.has(initial.id), false);
  await engine.stop();
});
test('edits arriving during completion cleanup are queued and acknowledged before clearing', async () => {
  const db = storage();
  const initial = record();
  let started!: () => void;
  const removing = new Promise<void>((resolve) => {
    started = resolve;
  });
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  let removals = 0;
  const store: DraftStorage = {
    put: db.store.put,
    async remove(user, id) {
      if (++removals === 1) {
        started();
        await blocked;
      }
      await db.store.remove(user, id);
    },
  };
  const calls: WorkoutPayload[] = [];
  const engine = new DraftController(
    makeDraft('user-a', initial),
    store,
    async (_id, payload) => {
      calls.push(payload);
      return {
        ...initial,
        status: 'COMPLETED',
        revision: calls.length + 1,
        memo: payload.memo,
      };
    },
    () => {},
    100000,
  );
  await engine.start();
  engine.update({
    ...initial,
    status: 'COMPLETED',
    endedAt: '2026-09-27T02:00:00Z',
  });
  const saving = engine.sync();
  await removing;
  engine.update({ ...engine.getSnapshot().doc.payload, memo: 'late edit' });
  release();
  await saving;
  assert.equal(calls.length, 2);
  assert.equal(calls[1]!.memo, 'late edit');
  assert.equal(engine.getSnapshot().doc.payload.memo, 'late edit');
  assert.equal(db.rows.size, 0);
  await engine.stop();
});
