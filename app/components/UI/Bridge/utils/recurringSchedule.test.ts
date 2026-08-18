import {
  capRecurringKeypadValue,
  parsePositiveInteger,
  RecurringScheduleErrorCode,
  RECURRING_MAX_DURATION_MINUTES,
  validateRecurringSchedule,
  type RecurringState,
} from './recurringSchedule';

const makeSchedule = (
  overrides: Partial<RecurringState> = {},
): RecurringState => ({
  everyValue: '1',
  everyUnit: 'hour',
  repeatCount: '10',
  ...overrides,
});

describe('parsePositiveInteger', () => {
  it('returns the number for a positive integer string', () => {
    const value = '24';

    const result = parsePositiveInteger(value);

    expect(result).toBe(24);
  });

  it.each(['', '0', '01', '1.5', 'abc', '-2'])(
    'returns undefined for %s',
    (value) => {
      const result = parsePositiveInteger(value);

      expect(result).toBeUndefined();
    },
  );
});

describe('capRecurringKeypadValue', () => {
  it('keeps the current value when the next value exceeds the digit cap', () => {
    const currentValue = '60';

    const result = capRecurringKeypadValue(currentValue, '6000', 3);

    expect(result).toBe('60');
  });

  it('returns the next value when it is within the digit cap', () => {
    const currentValue = '6';

    const result = capRecurringKeypadValue(currentValue, '60', 3);

    expect(result).toBe('60');
  });
});

describe('validateRecurringSchedule', () => {
  it('returns valid for the default 1 hour times 10 schedule', () => {
    const schedule = makeSchedule();

    const result = validateRecurringSchedule(schedule);

    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('returns every_invalid for an empty every value', () => {
    const schedule = makeSchedule({ everyValue: '' });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).toContain(RecurringScheduleErrorCode.EveryInvalid);
    expect(result.isValid).toBe(false);
  });

  it('returns every_invalid for a zero every value', () => {
    const schedule = makeSchedule({ everyValue: '0' });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).toContain(RecurringScheduleErrorCode.EveryInvalid);
  });

  it('returns repeat_invalid for an empty repeat count', () => {
    const schedule = makeSchedule({ repeatCount: '' });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).toContain(RecurringScheduleErrorCode.RepeatInvalid);
    expect(result.isValid).toBe(false);
  });

  it('returns every_exceeds_unit_max when hours exceed 24', () => {
    const schedule = makeSchedule({ everyValue: '25', everyUnit: 'hour' });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).toContain(
      RecurringScheduleErrorCode.EveryExceedsUnitMax,
    );
    expect(result.isValid).toBe(false);
  });

  it.each([
    { unit: 'minute' as const, max: '60' },
    { unit: 'hour' as const, max: '24' },
    { unit: 'day' as const, max: '7' },
    { unit: 'week' as const, max: '25' },
  ])('accepts the max every value of $max for $unit', ({ unit, max }) => {
    const schedule = makeSchedule({
      everyValue: max,
      everyUnit: unit,
      repeatCount: '1',
    });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).not.toContain(
      RecurringScheduleErrorCode.EveryExceedsUnitMax,
    );
  });

  it('accepts 1 day repeated 180 times', () => {
    const schedule = makeSchedule({
      everyValue: '1',
      everyUnit: 'day',
      repeatCount: '180',
    });

    const result = validateRecurringSchedule(schedule);

    expect(result).toEqual({ isValid: true, errors: [] });
  });

  it('returns duration_exceeds_max for 1 day repeated 181 times', () => {
    const schedule = makeSchedule({
      everyValue: '1',
      everyUnit: 'day',
      repeatCount: '181',
    });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).toContain(
      RecurringScheduleErrorCode.DurationExceedsMax,
    );
    expect(result.isValid).toBe(false);
  });

  it('returns duration_exceeds_max when the product exceeds 180 days in minutes', () => {
    const schedule = makeSchedule({
      everyValue: '1',
      everyUnit: 'minute',
      repeatCount: String(RECURRING_MAX_DURATION_MINUTES + 1),
    });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).toContain(
      RecurringScheduleErrorCode.DurationExceedsMax,
    );
  });

  it('returns both unit max and duration errors when both limits are exceeded', () => {
    const schedule = makeSchedule({
      everyValue: '61',
      everyUnit: 'minute',
      repeatCount: '10000',
    });

    const result = validateRecurringSchedule(schedule);

    expect(result.errors).toEqual([
      RecurringScheduleErrorCode.EveryExceedsUnitMax,
      RecurringScheduleErrorCode.DurationExceedsMax,
    ]);
  });
});
