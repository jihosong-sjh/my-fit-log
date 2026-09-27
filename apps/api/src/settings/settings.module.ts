import { Body, Controller, Get, Module, Patch } from '@nestjs/common';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, type AuthUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.module';
import { IsDecimalValue } from '../common/validators';
class SettingsDto {
  @ValidateIf((_o, v) => v !== undefined)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name?: string;
  @IsOptional() @IsDecimalValue(7, 2, 0.01) targetWeight?: string | null;
  @IsOptional() @IsDecimalValue(10, 2, 0.01) dailyCalories?: string | null;
  @IsOptional() @IsDecimalValue(10, 2, 0.01) proteinGoal?: string | null;
  @IsOptional() @IsDecimalValue(10, 2, 0.01) carbGoal?: string | null;
  @IsOptional() @IsDecimalValue(10, 2, 0.01) fatGoal?: string | null;
  @IsOptional() @IsInt() @Min(1) @Max(7) weeklyWorkoutGoal?: number | null;
  @ValidateIf((_o, v) => v !== undefined)
  @IsIn(['LIGHT', 'DARK', 'SYSTEM'])
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
}
@ApiTags('settings')
@Controller({ path: 'settings', version: '1' })
class SettingsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async get(@CurrentUser() user: AuthUser) {
    const row = await this.prisma.db.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        goal: true,
        preference: true,
      },
    });
    return {
      profile: { id: row.id, email: row.email, name: row.name },
      goal: row.goal,
      preference: row.preference,
    };
  }
  @Patch() async update(
    @CurrentUser() user: AuthUser,
    @Body() input: SettingsDto,
  ) {
    const { name, theme, ...goals } = input;
    await this.prisma.db.$transaction(async (tx) => {
      if (name !== undefined)
        await tx.user.update({ where: { id: user.id }, data: { name } });
      await tx.userGoal.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...goals },
        update: goals,
      });
      if (theme !== undefined)
        await tx.userPreference.upsert({
          where: { userId: user.id },
          create: { userId: user.id, theme },
          update: { theme },
        });
    });
    return this.get(user);
  }
}
@Module({ controllers: [SettingsController] })
export class SettingsModule {}
