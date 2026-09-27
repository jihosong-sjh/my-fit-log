import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  addDays,
  decimal,
  goalPercentage,
  localDate,
  pace,
  sum,
} from '@myfit/types';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { DateRangeDto } from '../workout/workout.dto';
import {
  AggregationModule,
  AggregationService,
  activity,
  dailyNutrition,
  periodNutrition,
  rangeDates,
  weeklyActivity,
  weightDifference,
  weightSeries,
} from '../common/aggregation';
@ApiTags('analytics')
@Controller({ path: 'analytics', version: '1' })
class AnalyticsController {
  constructor(private readonly stats: AggregationService) {}
  @Get() async get(
    @CurrentUser() user: AuthUser,
    @Query() range: DateRangeDto,
  ) {
    const to = range.to ?? localDate(new Date());
    const from = range.from ?? addDays(to, -29);
    const stats = await this.stats.load(user.id, from, to);
    const dates = rangeDates(from, to);
    const nutrition = periodNutrition(stats, from, to);
    const weights = stats.body.filter((b) => b.date >= from);
    const exercises = new Map<
      string,
      { exerciseId: string; name: string; values: Map<string, string> }
    >();
    for (const workout of stats.workouts.filter(
      (w) => w.status === 'COMPLETED',
    ))
      for (const exercise of workout.exercises) {
        const completed = exercise.sets.filter((s) => s.completed);
        if (!completed.length) continue;
        const entry = exercises.get(exercise.exerciseId) ?? {
          exerciseId: exercise.exerciseId,
          name: exercise.exerciseNameSnapshot,
          values: new Map(),
        };
        entry.name = exercise.exerciseNameSnapshot;
        for (const set of completed) {
          const current = entry.values.get(workout.date);
          if (
            current === undefined ||
            decimal(set.weight.toString()).gt(current)
          )
            entry.values.set(workout.date, set.weight.toString());
        }
        exercises.set(exercise.exerciseId, entry);
      }
    const exerciseTrends = [...exercises.values()].map(
      ({ values, ...row }) => ({
        ...row,
        points: dates.map((date) => ({
          date,
          weight: values.get(date) ?? null,
        })),
      }),
    );
    const cardioIds = [...new Set(stats.cardio.map((c) => c.exerciseId))];
    const cardio = cardioIds.map((id) => {
      const rows = stats.cardio.filter((c) => c.exerciseId === id);
      const last = rows.at(-1)!;
      const distances = rows.filter((c) => c.distanceKm !== null);
      const repetitions = rows.filter((c) => c.repetitions !== null);
      const distanceKm = distances.length
        ? sum(distances.map((c) => c.distanceKm!.toString()))
        : null;
      return {
        exerciseId: id,
        name: last.exerciseNameSnapshot,
        mode: last.exercise.cardioInputMode,
        durationSeconds: rows.reduce((a, c) => a + c.durationSeconds, 0),
        distanceKm,
        repetitions: repetitions.length
          ? repetitions.reduce((a, c) => a + c.repetitions!, 0)
          : null,
        paceSecondsPerKm: pace(
          distances.reduce((a, c) => a + c.durationSeconds, 0),
          distanceKm,
        ),
        points: dates.map((date) => {
          const day = rows.filter((c) => c.date === date);
          const dist = day.filter((c) => c.distanceKm !== null);
          const reps = day.filter((c) => c.repetitions !== null);
          return {
            date,
            durationSeconds: day.length
              ? day.reduce((a, c) => a + c.durationSeconds, 0)
              : null,
            distanceKm: dist.length
              ? sum(dist.map((c) => c.distanceKm!.toString()))
              : null,
            repetitions: reps.length
              ? reps.reduce((a, c) => a + c.repetitions!, 0)
              : null,
          };
        }),
      };
    });
    return {
      from,
      to,
      weight: {
        start: weights[0]?.weight ?? null,
        current: stats.current,
        difference: weightDifference(stats, from, to),
        series: weightSeries(stats, from, to),
      },
      workout: {
        ...activity(stats, from, to),
        weekly: weeklyActivity(stats),
        exerciseTrends,
      },
      nutrition: {
        ...nutrition,
        goals: {
          calories: stats.goal?.dailyCalories?.toString() ?? null,
          protein: stats.goal?.proteinGoal?.toString() ?? null,
          carbs: stats.goal?.carbGoal?.toString() ?? null,
          fat: stats.goal?.fatGoal?.toString() ?? null,
        },
        goalAchievement:
          nutrition.averageCalories === null
            ? null
            : goalPercentage(
                nutrition.averageCalories,
                stats.goal?.dailyCalories?.toString() ?? null,
              ),
        series: dates.map((date) => {
          const day = dailyNutrition(stats, date);
          return {
            date,
            calories: day.recorded ? day.totals.calories : null,
            protein: day.recorded ? day.totals.protein : null,
            carbs: day.recorded ? day.totals.carbs : null,
            fat: day.recorded ? day.totals.fat : null,
          };
        }),
      },
      cardio,
    };
  }
}
@Module({ imports: [AggregationModule], controllers: [AnalyticsController] })
export class AnalyticsModule {}
