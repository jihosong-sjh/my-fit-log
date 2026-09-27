import { createHash, randomUUID } from 'node:crypto';
import { parseDate } from '@myfit/types';
import type { PrismaClient } from '../generated/client';

// Construct only with the server-authenticated user's ID. Never accept it in a DTO.
// No raw Prisma input is accepted by these scoped write methods.
export class UserStore {
  constructor(
    private readonly db: PrismaClient,
    private readonly userId: string,
  ) {}
  exercises() {
    return this.db.exercise.findMany({
      where: {
        archivedAt: null,
        OR: [{ ownerId: null }, { ownerId: this.userId }],
      },
    });
  }
  foods() {
    return this.db.food.findMany({
      where: {
        archivedAt: null,
        OR: [{ ownerId: null }, { ownerId: this.userId }],
      },
    });
  }
  async archiveExercise(id: string) {
    const result = await this.db.exercise.updateMany({
      where: { id, ownerId: this.userId },
      data: { archivedAt: new Date() },
    });
    if (!result.count) throw new Error('EXERCISE_NOT_FOUND');
  }
  async archiveFood(id: string) {
    const result = await this.db.food.updateMany({
      where: { id, ownerId: this.userId },
      data: { archivedAt: new Date() },
    });
    if (!result.count) throw new Error('FOOD_NOT_FOUND');
  }
  async copyRoutine(routineId: string, date: string, startedAt: Date) {
    const recordingDate = parseDate(date);
    return this.db.$transaction(async (tx) => {
      const routine = await tx.workoutRoutine.findFirst({
        where: { id: routineId, userId: this.userId },
        include: {
          exercises: { orderBy: { order: 'asc' }, include: { exercise: true } },
        },
      });
      if (!routine) throw new Error('ROUTINE_NOT_FOUND');
      if (
        routine.exercises.some(
          (r) =>
            r.exercise.archivedAt ||
            r.exercise.trackingType !== 'STRENGTH' ||
            (r.exercise.ownerId !== null && r.exercise.ownerId !== this.userId),
        )
      )
        throw new Error('EXERCISE_UNAVAILABLE');
      const id = randomUUID();
      return tx.workoutSession.create({
        data: {
          id,
          userId: this.userId,
          sourceRoutineId: routine.id,
          date: recordingDate,
          startedAt,
          lastMutationId: randomUUID(),
          lastMutationHash: createHash('sha256')
            .update(JSON.stringify({ id, routineId, date, startedAt }))
            .digest('hex'),
          exercises: {
            create: routine.exercises.map((r) => ({
              exerciseId: r.exerciseId,
              exerciseNameSnapshot: r.exercise.name,
              order: r.order,
              sets: {
                create: Array.from({ length: r.defaultSets }, (_, index) => ({
                  setNumber: index + 1,
                  reps: r.defaultReps,
                })),
              },
            })),
          },
        },
        include: { exercises: { include: { sets: true } } },
      });
    });
  }
}
