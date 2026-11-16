import type { InterestHistoryEntry } from '../../hooks/useMoneyHistoricalEarnings';

export type EarningsRange = '1W' | '30D' | '3M' | '6M' | '1Y';

export interface EarningsPoint {
  timestamp: string;
  amount: number;
}

export const EARNINGS_RANGES = [
  '1W',
  '30D',
  '3M',
  '6M',
  '1Y',
] as const satisfies readonly EarningsRange[];

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

const RANGE_LENGTHS: Record<EarningsRange, number> = {
  '1W': 7,
  '30D': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

const ISO_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T/;
const AGGREGATION_OVERFLOW_ERROR =
  'Historical earnings aggregation exceeded the finite numeric range';

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const getDaysInMonth = (year: number, month: number): number => {
  const daysByMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return daysByMonth[month - 1] ?? 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const getTimestamp = (entry: unknown): number | undefined => {
  if (!isRecord(entry) || typeof entry.timestamp !== 'string') {
    return undefined;
  }

  const calendarDate = ISO_CALENDAR_DATE_PATTERN.exec(entry.timestamp);
  if (!calendarDate) {
    return undefined;
  }

  const year = Number(calendarDate[1]);
  const month = Number(calendarDate[2]);
  const day = Number(calendarDate[3]);
  if (month < 1 || month > 12 || day < 1 || day > getDaysInMonth(year, month)) {
    return undefined;
  }

  const timestamp = Date.parse(entry.timestamp);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const getAmount = (entry: unknown): number | undefined => {
  if (!isRecord(entry) || typeof entry.interest_earned_usd !== 'string') {
    return undefined;
  }

  if (entry.interest_earned_usd.trim() === '') {
    return undefined;
  }

  const amount = Number(entry.interest_earned_usd);
  return Number.isFinite(amount) ? amount : undefined;
};

const getUtcDayStart = (timestamp: number): number => {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const addEarnings = (total: number, amount: number): number => {
  const result = total + amount;
  if (!Number.isFinite(result)) {
    throw new Error(AGGREGATION_OVERFLOW_ERROR);
  }
  return result;
};

export const getRangeEntries = (
  entries: InterestHistoryEntry[],
  range: EarningsRange,
): InterestHistoryEntry[] => {
  const validEntries = entries
    .map((entry) => ({ entry, timestamp: getTimestamp(entry) }))
    .filter(
      (
        candidate,
      ): candidate is { entry: InterestHistoryEntry; timestamp: number } =>
        candidate.timestamp !== undefined,
    );

  if (validEntries.length === 0) {
    return [];
  }

  const newestTimestamp = Math.max(
    ...validEntries.map(({ timestamp }) => timestamp),
  );
  const endDay = getUtcDayStart(newestTimestamp);
  const startDay = endDay - (RANGE_LENGTHS[range] - 1) * MILLISECONDS_PER_DAY;

  return validEntries
    .filter(({ timestamp }) => {
      const day = getUtcDayStart(timestamp);
      return day >= startDay && day <= endDay;
    })
    .map(({ entry }) => entry);
};

const hasAggregationOverflow = (entries: InterestHistoryEntry[]): boolean => {
  const totalsByDay = new Map<number, number>();
  let total = 0;

  for (const entry of entries) {
    const timestamp = getTimestamp(entry);
    const amount = getAmount(entry);

    if (timestamp === undefined || amount === undefined) {
      continue;
    }

    total += amount;
    if (!Number.isFinite(total)) {
      return true;
    }

    const day = getUtcDayStart(timestamp);
    const dailyTotal = (totalsByDay.get(day) ?? 0) + amount;
    if (!Number.isFinite(dailyTotal)) {
      return true;
    }
    totalsByDay.set(day, dailyTotal);
  }

  return EARNINGS_RANGES.some((range) => {
    let rangeTotal = 0;

    for (const entry of getRangeEntries(entries, range)) {
      rangeTotal += getAmount(entry) ?? 0;
      if (!Number.isFinite(rangeTotal)) {
        return true;
      }
    }

    return false;
  });
};

export const hasInvalidHistoryEntries = (entries: unknown): boolean => {
  if (
    !Array.isArray(entries) ||
    entries.some(
      (entry) =>
        getTimestamp(entry) === undefined || getAmount(entry) === undefined,
    )
  ) {
    return true;
  }

  return hasAggregationOverflow(entries);
};

export const getDailyEarningsPoints = (
  entries: InterestHistoryEntry[],
  range?: EarningsRange,
): EarningsPoint[] => {
  const amountsByDay = entries.reduce<Map<number, number>>((points, entry) => {
    const timestamp = getTimestamp(entry);
    const amount = getAmount(entry);

    if (timestamp === undefined || amount === undefined) {
      return points;
    }

    const day = getUtcDayStart(timestamp);
    const existingAmount = points.get(day);
    points.set(
      day,
      existingAmount === undefined
        ? amount
        : addEarnings(existingAmount, amount),
    );
    return points;
  }, new Map());

  const points = [...amountsByDay.entries()]
    .sort(
      ([firstTimestamp], [secondTimestamp]) => firstTimestamp - secondTimestamp,
    )
    .map(([timestamp, amount]) => ({
      timestamp: new Date(timestamp).toISOString(),
      amount,
    }));

  if (range === undefined || points.length === 0) {
    return points;
  }

  const endDay = Date.parse(points[points.length - 1].timestamp);
  const startDay = endDay - (RANGE_LENGTHS[range] - 1) * MILLISECONDS_PER_DAY;

  return Array.from({ length: RANGE_LENGTHS[range] }, (_, index) => {
    const timestamp = startDay + index * MILLISECONDS_PER_DAY;
    return {
      timestamp: new Date(timestamp).toISOString(),
      amount: amountsByDay.get(timestamp) ?? 0,
    };
  });
};

export const sumEarnings = (entries: InterestHistoryEntry[]): number =>
  entries.reduce(
    (total, entry) => addEarnings(total, getAmount(entry) ?? 0),
    0,
  );
