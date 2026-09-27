import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { WorkoutService } from './workout.service';
import { SaveWorkoutDto, DeleteWorkoutDto, DateRangeDto } from './workout.dto';
@ApiTags('workouts')
@Controller({ path: 'workouts', version: '1' })
class WorkoutController {
  constructor(private readonly workouts: WorkoutService) {}
  @Get() list(@CurrentUser() user: AuthUser, @Query() range: DateRangeDto) {
    return this.workouts.list(user.id, range);
  }
  @Get(':id') get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.workouts.get(user.id, id);
  }
  @Put(':id') save(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: SaveWorkoutDto,
  ) {
    return this.workouts.save(user.id, id, input);
  }
  @Delete(':id') remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: DeleteWorkoutDto,
  ) {
    return this.workouts.remove(user.id, id, input.baseRevision);
  }
}
@Module({
  controllers: [WorkoutController],
  providers: [WorkoutService],
  exports: [WorkoutService],
})
export class WorkoutModule {}
