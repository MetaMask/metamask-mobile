import type { RecurringPriceRange } from './priceRange';

export const RECURRING_INTERVAL_UNITS = [
  'minute',
  'hour',
  'day',
  'week',
  'month',
] as const;

export type RecurringIntervalUnit = (typeof RECURRING_INTERVAL_UNITS)[number];

export type { RecurringPriceRange };

export interface RecurringState {
  everyValue: string;
  everyUnit: RecurringIntervalUnit;
  repeatCount: string;
  priceRange?: RecurringPriceRange;
}

export enum RecurringScheduleErrorCode {
  EveryInvalid = 'every_invalid',
  RepeatInvalid = 'repeat_invalid',
  EveryExceedsUnitMax = 'every_exceeds_unit_max',
  DurationExceedsMax = 'duration_exceeds_max',
}

export interface RecurringScheduleValidation {
  isValid: boolean;
  errors: RecurringScheduleErrorCode[];
}

export const RECURRING_EVERY_MAX_BY_UNIT: Record<
  RecurringIntervalUnit,
  number
> = {
  minute: 60,
  hour: 24,
  day: 7,
  week: 25,
  month: 6,
};

export const RECURRING_INTERVAL_MINUTES: Record<RecurringIntervalUnit, number> =
  {
    minute: 1,
    hour: 60,
    day: 1440,
    week: 10080,
    month: 30 * 1440,
  };

export const RECURRING_MAX_DURATION_DAYS = 180;
export const RECURRING_MAX_DURATION_MINUTES =
  RECURRING_MAX_DURATION_DAYS * 24 * 60;

export const DEFAULT_RECURRING_EVERY_VALUE = '1';
export const DEFAULT_RECURRING_EVERY_UNIT: RecurringIntervalUnit = 'hour';
export const DEFAULT_RECURRING_REPEAT_COUNT = '10';

export const RECURRING_EVERY_MAX_DIGITS = 3;
export const RECURRING_REPEAT_MAX_DIGITS = 6;

export const initialRecurringState: RecurringState = {
  everyValue: DEFAULT_RECURRING_EVERY_VALUE,
  everyUnit: DEFAULT_RECURRING_EVERY_UNIT,
  repeatCount: DEFAULT_RECURRING_REPEAT_COUNT,
  priceRange: undefined,
};

export function parsePositiveInteger(value: string): number | undefined {
  if (!/^[1-9]\d*$/.test(value)) {
    return undefined;
  }

  return Number(value);
}

export function capRecurringKeypadValue(
  currentValue: string,
  nextValue: string,
  maxDigits: number,
): string {
  if (nextValue.length > maxDigits) {
    return currentValue;
  }

  return nextValue;
}

export function validateRecurringSchedule(
  recurring: RecurringState,
): RecurringScheduleValidation {
  const errors: RecurringScheduleErrorCode[] = [];
  const every = parsePositiveInteger(recurring.everyValue);
  const repeat = parsePositiveInteger(recurring.repeatCount);

  if (every === undefined) {
    errors.push(RecurringScheduleErrorCode.EveryInvalid);
  } else if (every > RECURRING_EVERY_MAX_BY_UNIT[recurring.everyUnit]) {
    errors.push(RecurringScheduleErrorCode.EveryExceedsUnitMax);
  }

  if (repeat === undefined) {
    errors.push(RecurringScheduleErrorCode.RepeatInvalid);
  }

  if (every !== undefined && repeat !== undefined) {
    const durationMinutes =
      every * RECURRING_INTERVAL_MINUTES[recurring.everyUnit] * repeat;

    if (durationMinutes > RECURRING_MAX_DURATION_MINUTES) {
      errors.push(RecurringScheduleErrorCode.DurationExceedsMax);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
