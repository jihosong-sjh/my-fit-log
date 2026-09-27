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
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { Prisma } from '@myfit/database';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
import { IsDecimalValue } from '../common/validators';
export async function accessibleFood(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
  allowArchived = false,
) {
  const food = await tx.food.findFirst({
    where: { id, OR: [{ ownerId: null }, { ownerId: userId }] },
  });
  if (!food) throw new PublicError('NOT_FOUND');
  if (food.archivedAt && !allowArchived)
    throw new PublicError('VALIDATION_ERROR');
  return food;
}
class FoodDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;
  @IsDecimalValue(10, 3, 0.001) servingSize!: string;
  @IsIn(['G', 'ML', 'PIECE', 'PACK', 'SERVING']) servingUnit!:
    | 'G'
    | 'ML'
    | 'PIECE'
    | 'PACK'
    | 'SERVING';
  @IsDecimalValue(10, 2, 0) calories!: string;
  @IsDecimalValue(10, 2, 0) protein!: string;
  @IsDecimalValue(10, 2, 0) carbs!: string;
  @IsDecimalValue(10, 2, 0) fat!: string;
}
class FoodQuery {
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['name', 'recent', 'frequent']) sort?: string;
  @IsOptional() @IsIn(['true', 'false']) favorite?: string;
}
@ApiTags('foods')
@Controller({ path: 'foods', version: '1' })
class FoodController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@CurrentUser() user: AuthUser, @Query() query: FoodQuery) {
    const rows = await this.prisma.db.food.findMany({
      where: {
        archivedAt: null,
        OR: [{ ownerId: null }, { ownerId: user.id }],
        name: query.search
          ? { contains: query.search, mode: 'insensitive' }
          : undefined,
        ...(query.favorite === 'true'
          ? { favorites: { some: { userId: user.id } } }
          : {}),
      },
      include: {
        favorites: { where: { userId: user.id } },
        mealFoods: {
          where: { meal: { userId: user.id } },
          select: { createdAt: true, meal: { select: { date: true } } },
        },
      },
    });
    return rows
      .map(({ favorites, mealFoods, ...food }) => ({
        ...food,
        favorite: favorites.length > 0,
        usageCount: mealFoods.length,
        lastUsed:
          mealFoods
            .map((m) => m.meal.date.toISOString().slice(0, 10))
            .sort()
            .at(-1) ?? null,
      }))
      .sort((a, b) =>
        query.sort === 'frequent'
          ? b.usageCount - a.usageCount || a.name.localeCompare(b.name)
          : query.sort === 'recent'
            ? (b.lastUsed ?? '').localeCompare(a.lastUsed ?? '') ||
              a.name.localeCompare(b.name)
            : a.name.localeCompare(b.name),
      );
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() input: FoodDto) {
    return this.prisma.db.food.create({ data: { ...input, ownerId: user.id } });
  }
  @Put(':id') async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: FoodDto,
  ) {
    const result = await this.prisma.db.food.updateMany({
      where: { id, ownerId: user.id },
      data: input,
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return this.prisma.db.food.findUniqueOrThrow({ where: { id } });
  }
  @Delete(':id') async archive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.prisma.db.food.updateMany({
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
      await accessibleFood(tx, user.id, id);
      return tx.foodFavorite.upsert({
        where: { userId_foodId: { userId: user.id, foodId: id } },
        create: { userId: user.id, foodId: id },
        update: {},
      });
    });
  }
  @Delete(':id/favorite') async unfavorite(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.prisma.db.foodFavorite.deleteMany({
      where: { userId: user.id, foodId: id },
    });
    return { removed: true };
  }
}
@Module({ controllers: [FoodController] })
export class FoodModule {}
