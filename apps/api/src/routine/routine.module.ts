import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
import { accessibleExercise } from '../workout/workout.service';
class RoutineExerciseDto {
  @IsUUID() exerciseId!: string;
  @IsInt() @Min(1) @Max(100) defaultSets!: number;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) defaultReps!: number | null;
}
class RoutineDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RoutineExerciseDto)
  exercises!: RoutineExerciseDto[];
}
const include = {
  exercises: {
    orderBy: { order: 'asc' as const },
    include: { exercise: true },
  },
};
@ApiTags('routines')
@Controller({ path: 'routines', version: '1' })
class RoutineController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list(@CurrentUser() user: AuthUser) {
    return this.prisma.db.workoutRoutine.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include,
    });
  }
  @Get(':id') async get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.prisma.db.workoutRoutine.findFirst({
      where: { id, userId: user.id },
      include,
    });
    if (!row) throw new PublicError('NOT_FOUND');
    return row;
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() input: RoutineDto) {
    return this.save(user.id, null, input);
  }
  @Put(':id') update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RoutineDto,
  ) {
    return this.save(user.id, id, input);
  }
  private save(userId: string, id: string | null, input: RoutineDto) {
    return this.prisma.db.$transaction(async (tx) => {
      if (id && !(await tx.workoutRoutine.findFirst({ where: { id, userId } })))
        throw new PublicError('NOT_FOUND');
      for (const e of input.exercises)
        await accessibleExercise(tx, userId, e.exerciseId, 'STRENGTH');
      const data = { name: input.name, description: input.description ?? null };
      const row = id
        ? await tx.workoutRoutine.update({ where: { id }, data })
        : await tx.workoutRoutine.create({ data: { ...data, userId } });
      await tx.routineExercise.deleteMany({ where: { routineId: row.id } });
      await tx.routineExercise.createMany({
        data: input.exercises.map((e, order) => ({
          ...e,
          routineId: row.id,
          order,
        })),
      });
      return tx.workoutRoutine.findUniqueOrThrow({
        where: { id: row.id },
        include,
      });
    });
  }
  @Delete(':id') async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.prisma.db.workoutRoutine.deleteMany({
      where: { id, userId: user.id },
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return { deleted: true };
  }
}
@Module({ controllers: [RoutineController] })
export class RoutineModule {}
