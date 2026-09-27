import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { testContext } from './helpers';
let ctx: Awaited<ReturnType<typeof testContext>>;
before(async () => {
  ctx = await testContext();
});
after(async () => {
  await ctx?.close();
});
test('daily upsert, partial weight preservation, explicit null and ownership', async () => {
  const path = '/body/2026-09-27';
  assert.equal(
    (
      await ctx.request('PUT', path, {
        weight: '82',
        bodyFat: '20',
        muscleMass: '30',
        waist: '85',
        memo: 'keep',
      })
    ).status,
    200,
  );
  await ctx.request('PUT', path, { weight: '81.5' });
  let record = (await (await ctx.request('GET', path)).json()).data;
  assert.equal(record.bodyFat, '20');
  assert.equal(record.muscleMass, '30');
  assert.equal(record.waist, '85');
  assert.equal(record.memo, 'keep');
  assert.equal(
    await ctx.db.bodyRecord.count({ where: { userId: ctx.user.id } }),
    1,
  );
  await ctx.request('PUT', path, { weight: '81.5', bodyFat: null });
  record = (await (await ctx.request('GET', path)).json()).data;
  assert.equal(record.bodyFat, null);
  assert.equal(record.muscleMass, '30');
  const other = await ctx.makeUser();
  assert.equal(
    (await (await ctx.request('GET', path, undefined, other.cookie)).json())
      .data,
    null,
  );
  assert.equal(
    (await ctx.request('DELETE', path, undefined, other.cookie)).status,
    404,
  );
  for (const invalid of [
    { weight: '0' },
    { weight: '80', bodyFat: '100.1' },
    { weight: '80', userId: other.id },
    { weight: 80 },
  ])
    assert.equal((await ctx.request('PUT', path, invalid)).status, 400);
  assert.equal(
    (await ctx.request('PUT', '/body/2026-02-30', { weight: '80' })).status,
    400,
  );
});
test('calendar-day 7-day average includes lookback, skips missing days and empty periods', async () => {
  for (const [date, weight] of [
    ['2026-09-20', '100'],
    ['2026-09-21', '80'],
    ['2026-09-27', '82'],
  ])
    await ctx.request('PUT', `/body/${date}`, { weight });
  const result = (
    await (
      await ctx.request('GET', '/body?from=2026-09-21&to=2026-09-27')
    ).json()
  ).data;
  assert.equal(result.series.length, 7);
  assert.equal(result.records.length, 2);
  assert.equal(result.series[0].average, '90');
  assert.equal(result.series[1].weight, null);
  assert.equal(result.series[6].average, '81');
  assert.equal(result.difference, '2');
  assert.equal(result.current.date, '2026-09-27');
  const empty = (
    await (
      await ctx.request('GET', '/body?from=2026-01-01&to=2026-01-07')
    ).json()
  ).data;
  assert.equal(empty.records.length, 0);
  assert.equal(empty.current, null);
  assert.ok(
    empty.series.every((row: { average: unknown }) => row.average === null),
  );
  assert.equal(empty.difference, null);
  assert.equal((await ctx.request('DELETE', '/body/2026-09-27')).status, 200);
  assert.equal(
    (await (await ctx.request('GET', '/body/2026-09-27')).json()).data,
    null,
  );
});
