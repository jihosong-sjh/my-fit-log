import { Controller, Get, Module, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  addDays,
  average,
  decimal,
  goalPercentage,
  weekStart,
} from '@myfit/types';
import { IsDateOnly } from '../common/validators';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import {
  AggregationModule,
  AggregationService,
  activity,
  dailyNutrition,
  periodNutrition,
  weightDifference,
  weightSeries,
} from '../common/aggregation';
class DashboardQuery {
  @IsDateOnly() date!: string;
}
@ApiTags('dashboard')
@Controller({ path: 'dashboard', version: '1' })
class DashboardController {
  constructor(private readonly stats: AggregationService) {}
  @Get() async get(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardQuery,
  ) {
    const date = query.date;
    const start = weekStart(date);
    const end = addDays(start, 6);
    const stats = await this.stats.load(user.id, addDays(start, -7), end, date);
    const today = activity(stats, date, date);
    const nutrition = dailyNutrition(stats, date);
    const weekly = activity(stats, start, end);
    const recentMean = average(
      stats.body
        .filter((b) => b.date >= addDays(date, -6) && b.date <= date)
        .map((b) => b.weight),
    );
    const previousMean = average(
      stats.body
        .filter(
          (b) => b.date >= addDays(date, -13) && b.date <= addDays(date, -7),
        )
        .map((b) => b.weight),
    );
    const goals = {
      targetWeight: stats.goal?.targetWeight?.toString() ?? null,
      dailyCalories: stats.goal?.dailyCalories?.toString() ?? null,
      proteinGoal: stats.goal?.proteinGoal?.toString() ?? null,
      carbGoal: stats.goal?.carbGoal?.toString() ?? null,
      fatGoal: stats.goal?.fatGoal?.toString() ?? null,
      weeklyWorkoutGoal: stats.goal?.weeklyWorkoutGoal ?? null,
    };
    return {
      date,
      today,
      goals,
      nutrition: {
        ...nutrition,
        progress: {
          calories: nutrition.recorded
            ? goalPercentage(nutrition.totals.calories, goals.dailyCalories)
            : null,
          protein: nutrition.recorded
            ? goalPercentage(nutrition.totals.protein, goals.proteinGoal)
            : null,
          carbs: nutrition.recorded
            ? goalPercentage(nutrition.totals.carbs, goals.carbGoal)
            : null,
          fat: nutrition.recorded
            ? goalPercentage(nutrition.totals.fat, goals.fatGoal)
            : null,
        },
      },
      body: {
        current: stats.current,
        trend: weightSeries(stats, addDays(date, -6), date),
        average: recentMean,
        previousPeriodChange:
          recentMean !== null && previousMean !== null
            ? decimal(recentMean).minus(previousMean).toFixed()
            : null,
      },
      weekly: {
        from: start,
        to: end,
        ...weekly,
        ...periodNutrition(stats, start, end),
        weightChange: weightDifference(stats, start, end),
        goalPercentage: goalPercentage(
          String(weekly.workoutDays),
          goals.weeklyWorkoutGoal === null
            ? null
            : String(goals.weeklyWorkoutGoal),
        ),
      },
      recentWorkout: stats.recentWorkout,
    };
  }
}
@Module({ imports: [AggregationModule], controllers: [DashboardController] })
export class DashboardModule {}
