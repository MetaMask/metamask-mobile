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

const getTimestamp = (entry: InterestHistoryEntry): number | undefined => {
  const timestamp = Date.parse(entry.timestamp);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const getAmount = (entry: InterestHistoryEntry): number | undefined => {
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

export const getDailyEarningsPoints = (
  entries: InterestHistoryEntry[],
): EarningsPoint[] => {
  const amountsByDay = entries.reduce<Map<number, number>>((points, entry) => {
    const timestamp = getTimestamp(entry);
    const amount = getAmount(entry);

    if (timestamp === undefined || amount === undefined) {
      return points;
    }

    const day = getUtcDayStart(timestamp);
    points.set(day, (points.get(day) ?? 0) + amount);
    return points;
  }, new Map());

  return [...amountsByDay.entries()]
    .sort(
      ([firstTimestamp], [secondTimestamp]) => firstTimestamp - secondTimestamp,
    )
    .map(([timestamp, amount]) => ({
      timestamp: new Date(timestamp).toISOString(),
      amount,
    }));
};

export const sumEarnings = (entries: InterestHistoryEntry[]): number =>
  entries.reduce((total, entry) => total + (getAmount(entry) ?? 0), 0);
