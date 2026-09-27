import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsDateOnly, IsDecimalValue } from '../common/validators';
export class WorkoutSetDto {
  @IsUUID() id!: string;
  @IsDecimalValue(7, 2, 0) weight!: string;
  @IsOptional() @IsInt() @Min(1) @Max(2147483647) reps!: number | null;
  @IsOptional() @IsDecimalValue(4, 1, 1, 10) rpe!: string | null;
  @IsBoolean() completed!: boolean;
}
export class WorkoutExerciseDto {
  @IsUUID() id!: string;
  @IsUUID() exerciseId!: string;
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayUnique((item: WorkoutSetDto) => item.id)
  @ValidateNested({ each: true })
  @Type(() => WorkoutSetDto)
  sets!: WorkoutSetDto[];
}
export class SaveWorkoutDto {
  @ValidateIf((_o, v) => v !== null) @IsInt() @Min(1) baseRevision!:
    | number
    | null;
  @IsUUID() mutationId!: string;
  @IsDateOnly() date!: string;
  @IsIn(['IN_PROGRESS', 'COMPLETED']) status!: 'IN_PROGRESS' | 'COMPLETED';
  @IsISO8601({ strict: true }) startedAt!: string;
  @IsOptional() @IsISO8601({ strict: true }) endedAt!: string | null;
  @IsOptional() @IsUUID() sourceRoutineId?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) memo!: string | null;
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique((item: WorkoutExerciseDto) => item.id)
  @ValidateNested({ each: true })
  @Type(() => WorkoutExerciseDto)
  exercises!: WorkoutExerciseDto[];
}
export class DeleteWorkoutDto {
  @IsInt() @Min(1) baseRevision!: number;
}
export class DateRangeDto {
  @IsOptional() @IsDateOnly() from?: string;
  @IsOptional() @IsDateOnly() to?: string;
}
