import { Public } from './auth/auth.guard';
import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { validateEnvironment } from './common/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { GoalModule } from './goal/goal.module';
import { SettingsModule } from './settings/settings.module';
import { CardioModule } from './cardio/cardio.module';
import { CalendarModule } from './calendar/calendar.module';
import { WorkoutModule } from './workout/workout.module';
import { ExerciseModule } from './exercise/exercise.module';
import { RoutineModule } from './routine/routine.module';
import { FoodModule } from './food/food.module';
import { MealModule } from './meal/meal.module';
import { BodyModule } from './body/body.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
@Public()
@ApiTags('system')
@Controller({ path: '', version: '1' })
class InfoController {
  @Get()
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: { name: { type: 'string' }, version: { type: 'string' } },
        },
      },
    },
  })
  info() {
    return { name: 'MyFit Log', version: '1' };
  }
}
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.development', '.env.development'],
      validate: validateEnvironment,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UserModule,
    GoalModule,
    SettingsModule,
    CardioModule,
    CalendarModule,
    WorkoutModule,
    ExerciseModule,
    RoutineModule,
    FoodModule,
    MealModule,
    BodyModule,
    DashboardModule,
    AnalyticsModule,
  ],
  controllers: [InfoController],
})
export class AppModule {}
