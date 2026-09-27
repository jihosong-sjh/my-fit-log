import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
import { accessibleExercise } from '../workout/workout.service';
class ExerciseQuery {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['STRENGTH', 'CARDIO']) trackingType?:
    | 'STRENGTH'
    | 'CARDIO';
  @IsOptional() @IsIn(['true', 'false']) favorite?: string;
  @IsOptional() @IsIn(['name', 'recent']) sort?: string;
}
class ExerciseDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;
  @IsIn(['STRENGTH', 'CARDIO']) trackingType!: 'STRENGTH' | 'CARDIO';
  @IsOptional()
  @IsIn(['DISTANCE', 'REPETITIONS', 'DURATION'])
  cardioInputMode?: 'DISTANCE' | 'REPETITIONS' | 'DURATION' | null;
  @IsOptional() @IsString() @Length(1, 100) category?: string;
  @IsOptional() @IsString() @Length(1, 100) muscleGroup?: string;
}
class RenameExerciseDto {
  @ValidateIf((_o, v) => v !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name?: string;
}
@ApiTags('exercises')
@Controller({ path: 'exercises', version: '1' })
class ExerciseController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(
    @CurrentUser() user: AuthUser,
    @Query() query: ExerciseQuery,
  ) {
    const rows = await this.prisma.db.exercise.findMany({
      where: {
        archivedAt: null,
        OR: [{ ownerId: null }, { ownerId: user.id }],
        trackingType: query.trackingType,
        name: query.search
          ? { contains: query.search, mode: 'insensitive' }
          : undefined,
        ...(query.favorite === 'true'
          ? { favorites: { some: { userId: user.id } } }
          : {}),
      },
      include: {
        favorites: { where: { userId: user.id } },
        workoutExercises: {
          where: { workoutSession: { userId: user.id } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
        cardioRecords: {
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });
    const result = rows.map(
      ({ favorites, workoutExercises, cardioRecords, ...row }) => ({
        ...row,
        favorite: favorites.length > 0,
        recentAt:
          [...workoutExercises, ...cardioRecords]
            .map((r) => r.createdAt.toISOString())
            .sort()
            .at(-1) ?? null,
      }),
    );
    return result.sort((a, b) =>
      query.sort === 'recent'
        ? (b.recentAt ?? '').localeCompare(a.recentAt ?? '') ||
          a.name.localeCompare(b.name)
        : a.name.localeCompare(b.name),
    );
  }
  @Post() async create(
    @CurrentUser() user: AuthUser,
    @Body() input: ExerciseDto,
  ) {
    if (
      (input.trackingType === 'CARDIO' && !input.cardioInputMode) ||
      (input.trackingType === 'STRENGTH' && input.cardioInputMode)
    )
      throw new PublicError('VALIDATION_ERROR');
    return this.prisma.db.exercise.create({
      data: {
        ...input,
        ownerId: user.id,
        category: input.category ?? input.trackingType,
        muscleGroup: input.muscleGroup ?? 'FULL_BODY',
      },
    });
  }
  @Patch(':id') async rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: RenameExerciseDto,
  ) {
    const result = await this.prisma.db.exercise.updateMany({
      where: { id, ownerId: user.id },
      data: input,
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return { updated: true };
  }
  @Delete(':id') async archive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.prisma.db.exercise.updateMany({
      where: { id, ownerId: user.id },
      data: { archivedAt: new Date() },
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return { archived: true };
  }
  @Post(':id/favorite') favorite(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      await accessibleExercise(tx, user.id, id);
      return tx.exerciseFavorite.upsert({
        where: { userId_exerciseId: { userId: user.id, exerciseId: id } },
        create: { userId: user.id, exerciseId: id },
        update: {},
      });
    });
  }
  @Delete(':id/favorite') async unfavorite(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.prisma.db.exerciseFavorite.deleteMany({
      where: { userId: user.id, exerciseId: id },
    });
    return { removed: true };
  }
  @Get(':id/previous') async previous(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.prisma.db.$transaction(async (tx) => {
      const catalog = await accessibleExercise(
        tx,
        user.id,
        id,
        undefined,
        true,
      );
      if (catalog.trackingType === 'CARDIO')
        return tx.cardioRecord.findMany({
          where: { userId: user.id, exerciseId: id },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: 10,
        });
      return tx.workoutExercise.findFirst({
        where: {
          exerciseId: id,
          workoutSession: { userId: user.id, status: 'COMPLETED' },
        },
        orderBy: { workoutSession: { startedAt: 'desc' } },
        include: {
          sets: { where: { completed: true }, orderBy: { setNumber: 'asc' } },
          workoutSession: { select: { date: true } },
        },
      });
    });
  }
}
@Module({ controllers: [ExerciseController] })
export class ExerciseModule {}
