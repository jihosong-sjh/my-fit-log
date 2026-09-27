import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Put,
  Query,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import {
  addDays,
  decimal,
  localDate,
  movingAverage,
  parseDate,
} from '@myfit/types';
import { PrismaService } from '../prisma/prisma.module';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PublicError } from '../common/errors';
import { IsDecimalValue } from '../common/validators';
import { DateRangeDto } from '../workout/workout.dto';
class BodyDto {
  @IsDecimalValue(7, 2, 0.01) weight!: string;
  @IsOptional() @IsDecimalValue(4, 1, 0, 100) bodyFat?: string | null;
  @IsOptional() @IsDecimalValue(7, 2, 0.01) muscleMass?: string | null;
  @IsOptional() @IsDecimalValue(7, 2, 0.01) waist?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) memo?: string | null;
}
function dateValue(date: string) {
  try {
    return parseDate(date);
  } catch {
    throw new PublicError('VALIDATION_ERROR');
  }
}
@ApiTags('body')
@Controller({ path: 'body', version: '1' })
class BodyController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(
    @CurrentUser() user: AuthUser,
    @Query() range: DateRangeDto,
  ) {
    const to = range.to ?? localDate(new Date());
    const from = range.from ?? addDays(to, -29);
    const count =
      Math.round(
        (parseDate(to).getTime() - parseDate(from).getTime()) / 86400000,
      ) + 1;
    if (count < 1 || count > 3660) throw new PublicError('VALIDATION_ERROR');
    const [all, current] = await Promise.all([
      this.prisma.db.bodyRecord.findMany({
        where: {
          userId: user.id,
          date: { gte: parseDate(addDays(from, -6)), lte: parseDate(to) },
        },
        orderBy: { date: 'asc' },
      }),
      this.prisma.db.bodyRecord.findFirst({
        where: { userId: user.id, date: { lte: parseDate(to) } },
        orderBy: { date: 'desc' },
      }),
    ]);
    const points = all.map((row) => ({
      date: row.date.toISOString().slice(0, 10),
      weight: row.weight.toString(),
    }));
    const records = all
      .filter((row) => row.date >= parseDate(from))
      .map((row) => ({ ...row, date: row.date.toISOString().slice(0, 10) }));
    const series = Array.from({ length: count }, (_, i) => {
      const date = addDays(from, i);
      return {
        date,
        weight: points.find((p) => p.date === date)?.weight ?? null,
        average: movingAverage(points, date),
      };
    });
    return {
      from,
      to,
      records,
      series,
      current: current
        ? { ...current, date: current.date.toISOString().slice(0, 10) }
        : null,
      difference:
        records.length >= 2
          ? decimal(records.at(-1)!.weight.toString())
              .minus(records[0]!.weight.toString())
              .toFixed()
          : null,
    };
  }
  @Get(':date') async get(
    @CurrentUser() user: AuthUser,
    @Param('date') date: string,
  ) {
    const row = await this.prisma.db.bodyRecord.findUnique({
      where: { userId_date: { userId: user.id, date: dateValue(date) } },
    });
    return row ? { ...row, date } : null;
  }
  @Put(':date') async save(
    @CurrentUser() user: AuthUser,
    @Param('date') date: string,
    @Body() input: BodyDto,
  ) {
    const value = dateValue(date);
    const row = await this.prisma.db.bodyRecord.upsert({
      where: { userId_date: { userId: user.id, date: value } },
      create: { userId: user.id, date: value, ...input },
      update: input,
    });
    return { ...row, date };
  }
  @Delete(':date') async remove(
    @CurrentUser() user: AuthUser,
    @Param('date') date: string,
  ) {
    const result = await this.prisma.db.bodyRecord.deleteMany({
      where: { userId: user.id, date: dateValue(date) },
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return { deleted: true };
  }
}
@Module({ controllers: [BodyController] })
export class BodyModule {}
