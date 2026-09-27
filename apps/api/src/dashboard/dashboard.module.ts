import { Controller, Get, Module, Query } from '@nestjs/common';
import { IsDateOnly } from '../common/validators';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.module';
import { parseDate, sum } from '@myfit/types';
import { workoutInclude, workoutResult } from '../workout/workout.service';
class DashboardQuery {
  @IsDateOnly() date!: string;
}
@Controller({ path: 'dashboard', version: '1' })
class DashboardController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async get(
    @CurrentUser() user: AuthUser,
    @Query() query: DashboardQuery,
  ) {
    const [workouts, cardio] = await Promise.all([
      this.prisma.db.workoutSession.findMany({
        where: {
          userId: user.id,
          date: parseDate(query.date),
          status: 'COMPLETED',
        },
        include: workoutInclude,
      }),
      this.prisma.db.cardioRecord.findMany({
        where: { userId: user.id, date: parseDate(query.date) },
      }),
    ]);
    const completed = workouts.map(workoutResult);
    return {
      date: query.date,
      today: {
        workoutCount: workouts.length,
        cardioCount: cardio.length,
        durationSeconds:
          workouts.reduce((a, w) => a + (w.durationSeconds ?? 0), 0) +
          cardio.reduce((a, c) => a + c.durationSeconds, 0),
        totalSets: completed.reduce((a, w) => a + w.totalSets, 0),
        volume: sum(completed.map((w) => w.volume)),
      },
      recentWorkout: completed
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 5),
    };
  }
}
@Module({ controllers: [DashboardController] })
export class DashboardModule {}
