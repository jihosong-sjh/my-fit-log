import type { PrismaClient } from '../generated/client';
import type { CardioInputMode } from '../generated/enums';
const strength = [
  ['bench-press', 'Bench Press', 'CHEST'],
  ['squat', 'Squat', 'LEGS'],
  ['deadlift', 'Deadlift', 'BACK'],
  ['shoulder-press', 'Shoulder Press', 'SHOULDERS'],
  ['lat-pulldown', 'Lat Pulldown', 'BACK'],
  ['barbell-row', 'Barbell Row', 'BACK'],
  ['pull-up', 'Pull Up', 'BACK'],
  ['leg-press', 'Leg Press', 'LEGS'],
  ['leg-extension', 'Leg Extension', 'LEGS'],
  ['leg-curl', 'Leg Curl', 'LEGS'],
  ['lateral-raise', 'Lateral Raise', 'SHOULDERS'],
  ['biceps-curl', 'Biceps Curl', 'ARMS'],
  ['triceps-pushdown', 'Triceps Pushdown', 'ARMS'],
] as const;
const cardio: [string, string, CardioInputMode][] = [
  ['running', '러닝', 'DISTANCE'],
  ['jump-rope', '줄넘기', 'REPETITIONS'],
  ['walking', '걷기', 'DISTANCE'],
  ['cycling', '사이클', 'DISTANCE'],
  ['stair', '계단 오르기', 'DURATION'],
  ['swimming', '수영', 'DISTANCE'],
  ['other', '기타 유산소', 'DURATION'],
];
export async function seedCatalog(db: PrismaClient) {
  const entries = [
    ...strength.map(([key, name, muscleGroup]) => ({
      catalogKey: `strength-${key}`,
      name,
      muscleGroup,
      category: 'STRENGTH',
      trackingType: 'STRENGTH' as const,
      cardioInputMode: null,
    })),
    ...cardio.map(([key, name, cardioInputMode]) => ({
      catalogKey: `cardio-${key}`,
      name,
      muscleGroup: 'FULL_BODY',
      category: 'CARDIO',
      trackingType: 'CARDIO' as const,
      cardioInputMode,
    })),
  ];
  await db.$transaction(
    entries.map((data) =>
      db.exercise.upsert({
        where: { catalogKey: data.catalogKey },
        create: data,
        update: data,
      }),
    ),
  );
}
