import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@myfit/database';
import { completedVolume, decimal, parseDate } from '@myfit/types';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
import { SaveWorkoutDto, DateRangeDto } from './workout.dto';
export const workoutInclude = {
  exercises: {
    orderBy: { order: 'asc' },
    include: { sets: { orderBy: { setNumber: 'asc' } } },
  },
} satisfies Prisma.WorkoutSessionInclude;
export type WorkoutRow = Prisma.WorkoutSessionGetPayload<{
  include: typeof workoutInclude;
}>;
export function workoutResult(row: WorkoutRow) {
  const sets = row.exercises.flatMap((e) => e.sets);
  return {
    ...row,
    date: row.date.toISOString().slice(0, 10),
    totalSets: sets.filter((s) => s.completed).length,
    volume: completedVolume(
      sets.map((s) => ({ ...s, weight: s.weight.toString() })),
    ),
  };
}
export function dateWhere(range: DateRangeDto) {
  if (range.from && range.to && range.from > range.to)
    throw new PublicError('VALIDATION_ERROR');
  return {
    gte: range.from ? parseDate(range.from) : undefined,
    lte: range.to ? parseDate(range.to) : undefined,
  };
}
export async function accessibleExercise(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
  type?: 'STRENGTH' | 'CARDIO',
  allowArchived = false,
) {
  const exercise = await tx.exercise.findFirst({
    where: { id, OR: [{ ownerId: null }, { ownerId: userId }] },
  });
  if (!exercise) throw new PublicError('NOT_FOUND');
  if (
    (!allowArchived && exercise.archivedAt) ||
    (type && exercise.trackingType !== type)
  )
    throw new PublicError('VALIDATION_ERROR');
  return exercise;
}
@Injectable()
export class WorkoutService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, range: DateRangeDto) {
    return (
      await this.prisma.db.workoutSession.findMany({
        where: { userId, date: dateWhere(range) },
        orderBy: [{ date: 'desc' }, { startedAt: 'desc' }],
        include: workoutInclude,
      })
    ).map(workoutResult);
  }
  async get(userId: string, id: string) {
    const row = await this.prisma.db.workoutSession.findFirst({
      where: { id, userId },
      include: workoutInclude,
    });
    if (!row) throw new PublicError('NOT_FOUND');
    return workoutResult(row);
  }
  async save(userId: string, id: string, input: SaveWorkoutDto) {
    const normalized = {
      ...input,
      memo: input.memo ?? null,
      endedAt: input.endedAt ? new Date(input.endedAt).toISOString() : null,
      sourceRoutineId: input.sourceRoutineId ?? null,
      startedAt: new Date(input.startedAt).toISOString(),
      exercises: input.exercises.map((e) => ({
        ...e,
        sets: e.sets.map((s) => ({
          ...s,
          weight: decimal(s.weight).toFixed(),
          reps: s.reps ?? null,
          rpe: s.rpe == null ? null : decimal(s.rpe).toFixed(),
        })),
      })),
    };
    const hash = createHash('sha256')
      .update(
        JSON.stringify(normalized, (_key, value) =>
          value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(
                Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
              )
            : value,
        ),
      )
      .digest('hex');
    const allSetIds = normalized.exercises.flatMap((e) =>
      e.sets.map((s) => s.id),
    );
    if (new Set(allSetIds).size !== allSetIds.length)
      throw new PublicError('VALIDATION_ERROR');
    for (const set of normalized.exercises.flatMap((e) => e.sets))
      if (
        (set.completed && set.reps === null) ||
        (set.rpe !== null && !decimal(set.rpe).mod('0.5').eq(0))
      )
        throw new PublicError('VALIDATION_ERROR');
    return this.prisma.db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id}, 0))`;
        const current = await tx.workoutSession.findUnique({
          where: { id },
          include: workoutInclude,
        });
        if (current && current.userId !== userId)
          throw new PublicError('NOT_FOUND');
        if (current?.lastMutationId === input.mutationId) {
          if (current.lastMutationHash !== hash)
            throw new PublicError('CONFLICT');
          return workoutResult(current);
        }
        if (!current && input.baseRevision !== null)
          throw new PublicError('NOT_FOUND');
        if (current && current.revision !== input.baseRevision)
          throw new PublicError('CONFLICT');
        const sourceRoutineId = current
          ? current.sourceRoutineId
          : (input.sourceRoutineId ?? null);
        if (
          sourceRoutineId &&
          !(await tx.workoutRoutine.findFirst({
            where: { id: sourceRoutineId, userId },
          }))
        )
          throw new PublicError('NOT_FOUND');
        const endedAt =
          input.status === 'COMPLETED'
            ? new Date(input.endedAt ?? Date.now())
            : null;
        if (input.status === 'IN_PROGRESS' && input.endedAt)
          throw new PublicError('VALIDATION_ERROR');
        const durationSeconds = endedAt
          ? Math.floor(
              (endedAt.getTime() - new Date(input.startedAt).getTime()) / 1000,
            )
          : null;
        if (
          durationSeconds !== null &&
          (durationSeconds < 0 || durationSeconds > 2147483647)
        )
          throw new PublicError('VALIDATION_ERROR');
        if (
          input.status === 'COMPLETED' &&
          !normalized.exercises.some((e) => e.sets.some((s) => s.completed))
        )
          throw new PublicError('VALIDATION_ERROR');
        const exerciseIds = normalized.exercises.map((e) => e.id);
        if (
          (await tx.workoutExercise.count({
            where: { id: { in: exerciseIds }, workoutSessionId: { not: id } },
          })) ||
          (await tx.workoutSet.count({
            where: {
              id: { in: allSetIds },
              workoutExercise: { workoutSessionId: { not: id } },
            },
          }))
        )
          throw new PublicError('NOT_FOUND');
        const data = {
          date: parseDate(input.date),
          status: input.status,
          startedAt: new Date(input.startedAt),
          endedAt,
          durationSeconds,
          memo: input.memo ?? null,
          sourceRoutineId,
          lastMutationId: input.mutationId,
          lastMutationHash: hash,
        };
        if (current)
          await tx.workoutSession.update({
            where: { id },
            data: { ...data, revision: { increment: 1 } },
          });
        else await tx.workoutSession.create({ data: { id, userId, ...data } });
        await tx.workoutExercise.deleteMany({
          where: { workoutSessionId: id, id: { notIn: exerciseIds } },
        });
        await tx.workoutExercise.updateMany({
          where: { workoutSessionId: id },
          data: { order: { increment: 10000 } },
        });
        for (const [order, e] of normalized.exercises.entries()) {
          const previous = current?.exercises.find((old) => old.id === e.id);
          const catalog = await accessibleExercise(
            tx,
            userId,
            e.exerciseId,
            'STRENGTH',
            previous?.exerciseId === e.exerciseId,
          );
          if (previous)
            await tx.workoutExercise.update({
              where: { id: e.id },
              data: { exerciseId: e.exerciseId, order },
            });
          else
            await tx.workoutExercise.create({
              data: {
                id: e.id,
                workoutSessionId: id,
                exerciseId: e.exerciseId,
                exerciseNameSnapshot: catalog.name,
                order,
              },
            });
          const setIds = e.sets.map((s) => s.id);
          if (
            await tx.workoutSet.count({
              where: { id: { in: setIds }, workoutExerciseId: { not: e.id } },
            })
          )
            throw new PublicError('NOT_FOUND');
          await tx.workoutSet.deleteMany({
            where: { workoutExerciseId: e.id, id: { notIn: setIds } },
          });
          await tx.workoutSet.updateMany({
            where: { workoutExerciseId: e.id },
            data: { setNumber: { increment: 10000 } },
          });
          for (const [index, set] of e.sets.entries())
            await tx.workoutSet.upsert({
              where: { id: set.id },
              create: { ...set, workoutExerciseId: e.id, setNumber: index + 1 },
              update: {
                weight: set.weight,
                reps: set.reps,
                rpe: set.rpe,
                completed: set.completed,
                setNumber: index + 1,
              },
            });
        }
        return workoutResult(
          await tx.workoutSession.findUniqueOrThrow({
            where: { id },
            include: workoutInclude,
          }),
        );
      },
      { timeout: 15000 },
    );
  }
  async remove(userId: string, id: string, revision: number) {
    return this.prisma.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id},0))`;
      const row = await tx.workoutSession.findFirst({ where: { id, userId } });
      if (!row) throw new PublicError('NOT_FOUND');
      if (row.revision !== revision) throw new PublicError('CONFLICT');
      await tx.workoutSession.delete({ where: { id } });
      return { deleted: true };
    });
  }
}
