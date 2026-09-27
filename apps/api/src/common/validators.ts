import { registerDecorator, type ValidationOptions } from 'class-validator';
import { decimal, parseDate } from '@myfit/types';
export function IsDecimalValue(
  precision: number,
  scale: number,
  min: number,
  max?: number,
  options?: ValidationOptions,
) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'decimalValue',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          if (
            typeof value !== 'string' ||
            !new RegExp(
              `^\\d{1,${precision - scale}}(\\.\\d{1,${scale}})?$`,
            ).test(value)
          )
            return false;
          const number = decimal(value);
          return number.gte(min) && (max === undefined || number.lte(max));
        },
        defaultMessage() {
          return 'Invalid decimal value';
        },
      },
    });
}
export function IsDateOnly(options?: ValidationOptions) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      name: 'dateOnly',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          try {
            if (typeof value !== 'string') return false;
            parseDate(value);
            return true;
          } catch {
            return false;
          }
        },
        defaultMessage() {
          return 'Expected calendar date YYYY-MM-DD';
        },
      },
    });
}
