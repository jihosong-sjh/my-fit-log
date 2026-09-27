import { Injectable } from '@nestjs/common';
import { Prisma } from '@myfit/database';
import { parseDate, nutritionTotal } from '@myfit/types';
import { PrismaService } from '../prisma/prisma.module';
import { PublicError } from '../common/errors';
import { accessibleFood } from '../food/food.module';
import { dateWhere } from '../workout/workout.service';
import { MealDto, MealQuery } from './meal.dto';
export const mealInclude = {
  foods: { orderBy: { order: 'asc' } },
} satisfies Prisma.MealInclude;
export function foodSnapshot(food: Prisma.FoodGetPayload<object>) {
  return {
    foodNameSnapshot: food.name,
    servingSizeSnapshot: food.servingSize,
    servingUnitSnapshot: food.servingUnit,
    caloriesSnapshot: food.calories,
    proteinSnapshot: food.protein,
    carbsSnapshot: food.carbs,
    fatSnapshot: food.fat,
  };
}
export function mealResult(
  row: Prisma.MealGetPayload<{ include: typeof mealInclude }>,
) {
  return {
    ...row,
    date: row.date.toISOString().slice(0, 10),
    totals: nutritionTotal(
      row.foods.map((f) => ({
        caloriesSnapshot: f.caloriesSnapshot.toString(),
        proteinSnapshot: f.proteinSnapshot.toString(),
        carbsSnapshot: f.carbsSnapshot.toString(),
        fatSnapshot: f.fatSnapshot.toString(),
        servings: f.servings.toString(),
      })),
    ),
  };
}
@Injectable()
export class MealService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, query: MealQuery) {
    return (
      await this.prisma.db.meal.findMany({
        where: {
          userId,
          date: query.date ? parseDate(query.date) : dateWhere(query),
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: mealInclude,
      })
    ).map(mealResult);
  }
  async get(userId: string, id: string) {
    const row = await this.prisma.db.meal.findFirst({
      where: { id, userId },
      include: mealInclude,
    });
    if (!row) throw new PublicError('NOT_FOUND');
    return mealResult(row);
  }
  save(userId: string, id: string | null, input: MealDto) {
    return this.prisma.db.$transaction(
      async (tx) => {
        if (id)
          await tx.$queryRaw`SELECT id FROM "Meal" WHERE id=${id}::uuid AND "userId"=${userId}::uuid FOR UPDATE`;
        const current = id
          ? await tx.meal.findFirst({
              where: { id, userId },
              include: mealInclude,
            })
          : null;
        if (id && !current) throw new PublicError('NOT_FOUND');
        const ids = input.foods.map((f) => f.id);
        if (
          await tx.mealFood.count({
            where: { id: { in: ids }, ...(id ? { mealId: { not: id } } : {}) },
          })
        )
          throw new PublicError('NOT_FOUND');
        const data = {
          date: parseDate(input.date),
          mealType: input.mealType,
          memo: input.memo ?? null,
        };
        const meal = id
          ? await tx.meal.update({ where: { id }, data })
          : await tx.meal.create({ data: { ...data, userId } });
        await tx.mealFood.deleteMany({
          where: { mealId: meal.id, id: { notIn: ids } },
        });
        await tx.mealFood.updateMany({
          where: { mealId: meal.id },
          data: { order: { increment: 10000 } },
        });
        for (const [order, item] of input.foods.entries()) {
          const previous = current?.foods.find((f) => f.id === item.id);
          const food = await accessibleFood(
            tx,
            userId,
            item.foodId,
            previous?.foodId === item.foodId,
          );
          if (previous)
            await tx.mealFood.update({
              where: { id: item.id },
              data: { foodId: item.foodId, servings: item.servings, order },
            });
          else
            await tx.mealFood.create({
              data: { ...item, ...foodSnapshot(food), mealId: meal.id, order },
            });
        }
        return mealResult(
          await tx.meal.findUniqueOrThrow({
            where: { id: meal.id },
            include: mealInclude,
          }),
        );
      },
      { timeout: 15000 },
    );
  }
  async remove(userId: string, id: string) {
    const result = await this.prisma.db.meal.deleteMany({
      where: { id, userId },
    });
    if (!result.count) throw new PublicError('NOT_FOUND');
    return { deleted: true };
  }
}
