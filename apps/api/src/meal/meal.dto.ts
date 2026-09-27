import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsDateOnly, IsDecimalValue } from '../common/validators';
import { DateRangeDto } from '../workout/workout.dto';
export class MealFoodDto {
  @IsUUID() id!: string;
  @IsUUID() foodId!: string;
  @IsDecimalValue(10, 3, 0.001) servings!: string;
}
export class MealDto {
  @IsDateOnly() date!: string;
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']) mealType!:
    | 'BREAKFAST'
    | 'LUNCH'
    | 'DINNER'
    | 'SNACK';
  @IsOptional() @IsString() @MaxLength(2000) memo?: string | null;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique((food: MealFoodDto) => food.id)
  @ValidateNested({ each: true })
  @Type(() => MealFoodDto)
  foods!: MealFoodDto[];
}
export class MealQuery extends DateRangeDto {
  @IsOptional() @IsDateOnly() date?: string;
}
export class PresetFoodDto {
  @IsUUID() foodId!: string;
  @IsDecimalValue(10, 3, 0.001) servings!: string;
}
export class PresetDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @Length(1, 100)
  name!: string;
  @IsOptional()
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  defaultMealType?: MealDto['mealType'] | null;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PresetFoodDto)
  foods!: PresetFoodDto[];
}
export class ApplyPresetDto {
  @IsDateOnly() date!: string;
  @IsOptional()
  @IsIn(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'])
  mealType?: MealDto['mealType'];
}
