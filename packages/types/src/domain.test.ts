import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  localDate,
  parseDate,
  weekStart,
  sum,
  average,
  movingAverage,
  goalPercentage,
  completedVolume,
  workoutDays,
  nutritionTotal,
  pace,
} from './domain';
test('Seoul midnight, Monday week boundary and invalid dates', () => {
  assert.equal(localDate(new Date('2026-09-27T15:00:00Z')), '2026-09-28');
  assert.equal(weekStart('2026-09-27'), '2026-09-21');
  assert.equal(weekStart('2026-09-28'), '2026-09-28');
  assert.throws(() => parseDate('2026-02-29'));
  assert.equal(
    parseDate('2024-02-29').toISOString(),
    '2024-02-29T00:00:00.000Z',
  );
});
test('Decimal arithmetic, missing days and unset goals', () => {
  assert.equal(sum(['0.1', '0.2']), '0.3');
  assert.equal(average([]), null);
  assert.equal(goalPercentage('120', null), null);
  assert.equal(goalPercentage('120', '100'), '120');
  assert.equal(
    movingAverage(
      [
        { date: '2026-09-20', weight: '100' },
        { date: '2026-09-21', weight: '80.2' },
        { date: '2026-09-27', weight: '80.4' },
      ],
      '2026-09-27',
    ),
    '80.3',
  );
  assert.equal(movingAverage([], '2026-09-27'), null);
});
test('Completed external-weight volume, unique workout days, snapshots and pace', () => {
  assert.equal(
    completedVolume([
      { weight: '80', reps: 8, completed: true },
      { weight: '100', reps: 8, completed: false },
      { weight: '0', reps: 10, completed: true },
    ]),
    '640',
  );
  assert.equal(
    workoutDays(
      ['2026-09-21'],
      ['2026-09-21', '2026-09-23'],
      '2026-09-21',
      '2026-09-27',
    ),
    2,
  );
  assert.deepEqual(
    nutritionTotal([
      {
        caloriesSnapshot: '165',
        proteinSnapshot: '31',
        carbsSnapshot: '0',
        fatSnapshot: '3.6',
        servings: '2',
      },
    ]),
    { calories: '330', protein: '62', carbs: '0', fat: '7.2' },
  );
  assert.equal(pace(1500, '5'), '300');
  assert.equal(pace(60, null), null);
});

import { periodStart } from './domain';
test('calendar month periods clamp leap day', () => {
  assert.equal(periodStart('2024-02-29', '1Y'), '2023-02-28');
  assert.equal(periodStart('2026-09-27', '3M'), '2026-06-27');
  assert.throws(() => parseDate('0000-01-01'));
});
