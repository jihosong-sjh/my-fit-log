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
  Query,
} from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
import { IsDateOnly, IsDecimalValue } from '../common/validators';
import { accessibleExercise, dateWhere } from '../workout/workout.service';
import { DateRangeDto } from '../workout/workout.dto';
import { parseDate, pace } from '@myfit/types';
class CardioDto {
  @IsDateOnly() date!: string;
  @IsUUID() exerciseId!: string;
  @IsInt() @Min(1) @Max(2147483647) durationSeconds!: number;
  @IsOptional() @IsDecimalValue(8, 3, 0.001) distanceKm?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) repetitions?: number | null;
  @IsOptional() @IsDecimalValue(10, 2, 0) calories?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(300) averageHeartRate?: number | null;
  @IsOptional() @IsString() @MaxLength(2000) memo?: string | null;
}
@ApiTags('cardio')
@Controller({ path: 'cardio', version: '1' })
class CardioController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(
    @CurrentUser() user: AuthUser,
    @Query() range: DateRangeDto,
  ) {
    return (
      await this.prisma.db.cardioRecord.findMany({
        where: { userId: user.id, date: dateWhere(range) },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: { exercise: { select: { cardioInputMode: true } } },
      })
    ).map((row) => ({
      ...row,
      date: row.date.toISOString().slice(0, 10),
      paceSecondsPerKm: pace(
        row.durationSeconds,
        row.distanceKm?.toString() ?? null,
      ),
    }));
  }
  @Get(':id') async get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const row = await this.prisma.db.cardioRecord.findFirst({
      where: { id, userId: user.id },
      include: { exercise: { select: { cardioInputMode: true } } },
    });
    if (!row) throw new PublicError('NOT_FOUND');
    return {
      ...row,
      date: row.date.toISOString().slice(0, 10),
      paceSecondsPerKm: pace(
        row.durationSeconds,
        row.distanceKm?.toString() ?? null,
      ),
    };
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() input: CardioDto) {
    return this.save(user.id, null, input);
  }
  @Put(':id') update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CardioDto,
  ) {
    return this.save(user.id, id, input);
  }
  private save(userId: string, id: string | null, input: CardioDto) {
    return this.prisma.db.$transaction(async (tx) => {
      const previous = id
        ? await tx.cardioRecord.findFirst({ where: { id, userId } })
        : null;
      if (id && !previous) throw new PublicError('NOT_FOUND');
      const exercise = await accessibleExercise(
        tx,
        userId,
        input.exerciseId,
        'CARDIO',
        previous?.exerciseId === input.exerciseId,
      );
      if (
        (input.distanceKm != null && exercise.cardioInputMode !== 'DISTANCE') ||
        (input.repetitions != null &&
          exercise.cardioInputMode !== 'REPETITIONS')
      )
        throw new PublicError('VALIDATION_ERROR');
      const data = {
        ...input,
        date: parseDate(input.date),
        distanceKm: input.distanceKm ?? null,
        repetitions: input.repetitions ?? null,
        calories: input.calories ?? null,
        averageHeartRate: input.averageHeartRate ?? null,
        memo: input.memo ?? null,
        exerciseNameSnapshot: exercise.name,
      };
      return id
        ? tx.cardioRecord.update({ where: { id }, data })
        : tx.cardioRecord.create({ data: { ...data, userId } });
    });
  }
  @Delete(':id') async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.prisma.db.cardioRecord.deleteMany({
      where: { id, userId: user.id },
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return { deleted: true };
  }
}
@Module({ controllers: [CardioController] })
export class CardioModule {}
