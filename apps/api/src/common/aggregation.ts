import { Injectable, Module } from '@nestjs/common';
import {
  addDays,
  average,
  decimal,
  movingAverage,
  nutritionTotal,
  parseDate,
  sum,
  weekStart,
} from '@myfit/types';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from './errors';
import { workoutInclude, workoutResult } from '../workout/workout.service';
import { mealInclude, mealResult } from '../meal/meal.service';
export function rangeDates(from: string, to: string) {
  const count =
    Math.round(
      (parseDate(to).getTime() - parseDate(from).getTime()) / 86400000,
    ) + 1;
  if (count < 1 || count > 3660) throw new PublicError('VALIDATION_ERROR');
  return Array.from({ length: count }, (_, i) => addDays(from, i));
}
@Injectable()
export class AggregationService {
  constructor(private readonly prisma: PrismaService) {}
  async load(userId: string, from: string, to: string, asOf = to) {
    rangeDates(from, to);
    const date = { gte: parseDate(from), lte: parseDate(to) };
    const [workoutRows, cardio, mealRows, body, goal, current, recent] =
      await this.prisma.db.$transaction(
        [
          this.prisma.db.workoutSession.findMany({
            where: { userId, date },
            include: workoutInclude,
            orderBy: { date: 'asc' },
          }),
          this.prisma.db.cardioRecord.findMany({
            where: { userId, date },
            include: { exercise: { select: { cardioInputMode: true } } },
            orderBy: { date: 'asc' },
          }),
          this.prisma.db.meal.findMany({
            where: { userId, date },
            include: mealInclude,
            orderBy: { date: 'asc' },
          }),
          this.prisma.db.bodyRecord.findMany({
            where: {
              userId,
              date: { gte: parseDate(addDays(from, -6)), lte: parseDate(to) },
            },
            orderBy: { date: 'asc' },
          }),
          this.prisma.db.userGoal.findUnique({ where: { userId } }),
          this.prisma.db.bodyRecord.findFirst({
            where: { userId, date: { lte: parseDate(asOf) } },
            orderBy: { date: 'desc' },
          }),
          this.prisma.db.workoutSession.findMany({
            where: {
              userId,
              status: 'COMPLETED',
              date: { lte: parseDate(asOf) },
            },
            orderBy: [{ date: 'desc' }, { startedAt: 'desc' }],
            take: 5,
            include: workoutInclude,
          }),
        ],
        { isolationLevel: 'RepeatableRead' },
      );
    return {
      from,
      to,
      workouts: workoutRows.map(workoutResult),
      cardio: cardio.map((c) => ({
        ...c,
        date: c.date.toISOString().slice(0, 10),
      })),
      meals: mealRows.map(mealResult),
      body: body.map((b) => ({
        ...b,
        date: b.date.toISOString().slice(0, 10),
        weight: b.weight.toString(),
      })),
      goal,
      current: current
        ? {
            ...current,
            date: current.date.toISOString().slice(0, 10),
            weight: current.weight.toString(),
          }
        : null,
      recentWorkout: recent.map(workoutResult),
    };
  }
}
export type LoadedStats = Awaited<ReturnType<AggregationService['load']>>;
export function dailyNutrition(stats: LoadedStats, date: string) {
  const meals = stats.meals.filter((m) => m.date === date);
  return {
    recorded: meals.length > 0,
    totals: nutritionTotal(
      meals
        .flatMap((m) => m.foods)
        .map((f) => ({
          caloriesSnapshot: f.caloriesSnapshot.toString(),
          proteinSnapshot: f.proteinSnapshot.toString(),
          carbsSnapshot: f.carbsSnapshot.toString(),
          fatSnapshot: f.fatSnapshot.toString(),
          servings: f.servings.toString(),
        })),
    ),
  };
}
export function activity(stats: LoadedStats, from: string, to: string) {
  const workouts = stats.workouts.filter(
    (w) => w.date >= from && w.date <= to && w.status === 'COMPLETED',
  );
  const cardio = stats.cardio.filter((c) => c.date >= from && c.date <= to);
  return {
    workoutCount: workouts.length,
    cardioCount: cardio.length,
    workoutDays: new Set([...workouts, ...cardio].map((r) => r.date)).size,
    durationSeconds:
      workouts.reduce((a, w) => a + (w.durationSeconds ?? 0), 0) +
      cardio.reduce((a, c) => a + c.durationSeconds, 0),
    totalSets: workouts.reduce((a, w) => a + w.totalSets, 0),
    volume: sum(workouts.map((w) => w.volume)),
  };
}
export function periodNutrition(stats: LoadedStats, from: string, to: string) {
  const dates = [
    ...new Set(
      stats.meals
        .filter((m) => m.date >= from && m.date <= to)
        .map((m) => m.date),
    ),
  ];
  const totals = dates.map((d) => dailyNutrition(stats, d).totals);
  return {
    recordedDays: dates.length,
    averageCalories: average(totals.map((t) => t.calories)),
    averageProtein: average(totals.map((t) => t.protein)),
    averageCarbs: average(totals.map((t) => t.carbs)),
    averageFat: average(totals.map((t) => t.fat)),
  };
}
export function weightSeries(stats: LoadedStats, from: string, to: string) {
  return rangeDates(from, to).map((date) => ({
    date,
    weight: stats.body.find((b) => b.date === date)?.weight ?? null,
    average: movingAverage(stats.body, date),
  }));
}
export function weightDifference(stats: LoadedStats, from: string, to: string) {
  const records = stats.body.filter((b) => b.date >= from && b.date <= to);
  return records.length >= 2
    ? decimal(records.at(-1)!.weight).minus(records[0]!.weight).toFixed()
    : null;
}
export function weeklyActivity(stats: LoadedStats) {
  const starts = [...new Set(rangeDates(stats.from, stats.to).map(weekStart))];
  return starts.map((date) => ({
    date,
    ...activity(stats, date, addDays(date, 6)),
  }));
}
@Module({ providers: [AggregationService], exports: [AggregationService] })
export class AggregationModule {}
