import { randomUUID } from 'node:crypto';
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
import { ApiTags } from '@nestjs/swagger';
import { parseDate, nutritionTotal } from '@myfit/types';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
import { accessibleFood } from '../food/food.module';
import { MealDto, MealQuery, PresetDto, ApplyPresetDto } from './meal.dto';
import {
  MealService,
  foodSnapshot,
  mealInclude,
  mealResult,
} from './meal.service';
@ApiTags('meals')
@Controller({ path: 'meals', version: '1' })
class MealController {
  constructor(private readonly meals: MealService) {}
  @Get() list(@CurrentUser() user: AuthUser, @Query() query: MealQuery) {
    return this.meals.list(user.id, query);
  }
  @Get(':id') get(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.meals.get(user.id, id);
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() input: MealDto) {
    return this.meals.save(user.id, null, input);
  }
  @Put(':id') update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: MealDto,
  ) {
    return this.meals.save(user.id, id, input);
  }
  @Delete(':id') remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.meals.remove(user.id, id);
  }
}
const presetInclude = {
  foods: { orderBy: { order: 'asc' as const }, include: { food: true } },
};
@ApiTags('meal-presets')
@Controller({ path: 'meal-presets', version: '1' })
class PresetController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.db.mealPreset.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: presetInclude,
    });
    return rows.map((row) => ({
      ...row,
      totals: nutritionTotal(
        row.foods.map((f) => ({
          caloriesSnapshot: f.food.calories.toString(),
          proteinSnapshot: f.food.protein.toString(),
          carbsSnapshot: f.food.carbs.toString(),
          fatSnapshot: f.food.fat.toString(),
          servings: f.servings.toString(),
        })),
      ),
    }));
  }
  @Post() create(@CurrentUser() user: AuthUser, @Body() input: PresetDto) {
    return this.save(user.id, null, input);
  }
  @Put(':id') update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: PresetDto,
  ) {
    return this.save(user.id, id, input);
  }
  private save(userId: string, id: string | null, input: PresetDto) {
    return this.prisma.db.$transaction(async (tx) => {
      if (id && !(await tx.mealPreset.findFirst({ where: { id, userId } })))
        throw new PublicError('NOT_FOUND');
      for (const f of input.foods) await accessibleFood(tx, userId, f.foodId);
      const data = {
        name: input.name,
        defaultMealType: input.defaultMealType ?? null,
      };
      const row = id
        ? await tx.mealPreset.update({ where: { id }, data })
        : await tx.mealPreset.create({ data: { ...data, userId } });
      await tx.mealPresetFood.deleteMany({ where: { presetId: row.id } });
      await tx.mealPresetFood.createMany({
        data: input.foods.map((f, order) => ({
          ...f,
          order,
          presetId: row.id,
        })),
      });
      return tx.mealPreset.findUniqueOrThrow({
        where: { id: row.id },
        include: presetInclude,
      });
    });
  }
  @Delete(':id') async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const result = await this.prisma.db.mealPreset.deleteMany({
      where: { id, userId: user.id },
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return { deleted: true };
  }
  @Post(':id/apply') apply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: ApplyPresetDto,
  ) {
    return this.prisma.db.$transaction(
      async (tx) => {
        const preset = await tx.mealPreset.findFirst({
          where: { id, userId: user.id },
          include: presetInclude,
        });
        if (!preset) throw new PublicError('NOT_FOUND');
        const mealType = input.mealType ?? preset.defaultMealType;
        if (!mealType || !preset.foods.length)
          throw new PublicError('VALIDATION_ERROR');
        const foods = [];
        for (const [order, item] of preset.foods.entries()) {
          const food = await accessibleFood(tx, user.id, item.foodId);
          foods.push({
            id: randomUUID(),
            foodId: food.id,
            ...foodSnapshot(food),
            servings: item.servings,
            order,
          });
        }
        const meal = await tx.meal.create({
          data: {
            userId: user.id,
            date: parseDate(input.date),
            mealType,
            foods: { create: foods },
          },
          include: mealInclude,
        });
        return mealResult(meal);
      },
      { timeout: 15000 },
    );
  }
}
@Module({
  controllers: [MealController, PresetController],
  providers: [MealService],
  exports: [MealService],
})
export class MealModule {}
