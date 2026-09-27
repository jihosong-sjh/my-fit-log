import { Controller, Get, Module, Query } from '@nestjs/common';
import { Matches } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { parseDate } from '@myfit/types';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { IsDateOnly } from '../common/validators';
import {
  AggregationModule,
  AggregationService,
  dailyNutrition,
  rangeDates,
} from '../common/aggregation';
class MonthQuery {
  @Matches(/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/) month!: string;
}
class DayQuery {
  @IsDateOnly() date!: string;
}
@ApiTags('calendar')
@Controller({ path: 'calendar', version: '1' })
class CalendarController {
  constructor(private readonly stats: AggregationService) {}
  @Get() async month(
    @CurrentUser() user: AuthUser,
    @Query() query: MonthQuery,
  ) {
    const from = `${query.month}-01`;
    const end = parseDate(from);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    const to = end.toISOString().slice(0, 10);
    const stats = await this.stats.load(user.id, from, to);
    return {
      month: query.month,
      days: rangeDates(from, to).map((date) => ({
        date,
        workout:
          stats.workouts.some(
            (w) => w.date === date && w.status === 'COMPLETED',
          ) || stats.cardio.some((c) => c.date === date),
        inProgress: stats.workouts.some(
          (w) => w.date === date && w.status === 'IN_PROGRESS',
        ),
        meal: stats.meals.some((m) => m.date === date),
        body: stats.body.some((b) => b.date === date),
      })),
    };
  }
  @Get('day') async day(
    @CurrentUser() user: AuthUser,
    @Query() query: DayQuery,
  ) {
    const stats = await this.stats.load(user.id, query.date, query.date);
    return {
      date: query.date,
      workouts: stats.workouts,
      cardio: stats.cardio,
      meals: stats.meals,
      nutrition: dailyNutrition(stats, query.date),
      body: stats.body.find((b) => b.date === query.date) ?? null,
    };
  }
}
@Module({ imports: [AggregationModule], controllers: [CalendarController] })
export class CalendarModule {}
