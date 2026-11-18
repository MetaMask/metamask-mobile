import type {
  InterestHistoryAvailability,
  InterestHistoryBucket,
  InterestHistoryGranularity,
  InterestHistoryRange,
  InterestHistoryResponse,
  PeriodStatus,
  UnavailableReason,
} from '../../types/moneyInterestHistory';
import { parseFiniteUsd } from './earningsHistoryValidation';

export type EarningsRange = '1W' | '30D' | '3M' | '6M' | '1Y';

export interface EarningsPoint {
  start: string;
  periodEndExclusive: string;
  timestamp: string;
  amountUsd: number | null;
  granularity: InterestHistoryGranularity;
  periodStatus: PeriodStatus;
  availability: InterestHistoryAvailability;
  unavailableReasons: UnavailableReason[];
}

export const EARNINGS_RANGES = [
  '1W',
  '30D',
  '3M',
  '6M',
  '1Y',
] as const satisfies readonly EarningsRange[];

const ISO_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T/;

const RANGE_CONFIG: Record<EarningsRange, InterestHistoryRange['range']> = {
  '1W': '7d',
  '30D': '30d',
  '3M': '90d',
  '6M': '180d',
  '1Y': '365d',
};

const getTimestamp = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const calendarDate = ISO_CALENDAR_DATE_PATTERN.exec(value);
  if (!calendarDate) {
    return undefined;
  }

  const year = Number(calendarDate[1]);
  const month = Number(calendarDate[2]);
  const day = Number(calendarDate[3]);
  const calendarTimestamp = Date.UTC(year, month - 1, day);
  const calendar = new Date(calendarTimestamp);
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

export const getSelectedRange = (
  response: InterestHistoryResponse | undefined,
  range: EarningsRange,
): InterestHistoryRange | undefined =>
  response?.ranges.find(
    ({ range: candidateRange }) => candidateRange === RANGE_CONFIG[range],
  );

const getBucketAmountUsd = (bucket: InterestHistoryBucket): number | null => {
  if (bucket.interest_earned_usd === null) {
    return null;
  }

  const amountUsd = parseFiniteUsd(bucket.interest_earned_usd);
  if (amountUsd === undefined) {
    throw new Error('Historical earnings contains an invalid USD amount');
  }
  return amountUsd;
};

export const getBucketPoints = (
  selectedRange: InterestHistoryRange | undefined,
): EarningsPoint[] =>
  selectedRange?.buckets.map((bucket) => ({
    start: bucket.start,
    periodEndExclusive: bucket.end,
    timestamp: bucket.start,
    amountUsd: getBucketAmountUsd(bucket),
    granularity: selectedRange.granularity,
    periodStatus: bucket.period_status,
    availability: bucket.availability,
    unavailableReasons: bucket.unavailable_reasons,
  })) ?? [];

export const isAvailableBucket = (point: EarningsPoint): boolean =>
  point.amountUsd !== null &&
  point.availability.earnings === 'available' &&
  point.availability.usd_pricing === 'available';

export const getAuthoritativeRangeTotalUsd = (
  selectedRange: InterestHistoryRange | undefined,
): number | undefined => {
  const serializedTotal = selectedRange?.totals.interest_earned_usd;
  if (serializedTotal === undefined || serializedTotal === null) {
    return undefined;
  }

  const totalUsd = parseFiniteUsd(serializedTotal);
  if (totalUsd === undefined) {
    throw new Error('Historical earnings contains an invalid range total');
  }
  return totalUsd;
};

export const getLatestAvailableBucketIndex = (
  points: EarningsPoint[],
): number =>
  points.reduce(
    (latestIndex, point, index) =>
      isAvailableBucket(point) ? index : latestIndex,
    -1,
  );

export interface EarningsDisplayDateRange {
  displayStart: string;
  displayEnd: string;
}

export const getBucketDisplayDateRange = (
  point: Pick<EarningsPoint, 'start' | 'periodEndExclusive'>,
): EarningsDisplayDateRange => {
  const startTimestamp = getTimestamp(point.start);
  const endTimestamp = getTimestamp(point.periodEndExclusive);

  if (startTimestamp === undefined || endTimestamp === undefined) {
    throw new Error('Historical earnings contains an invalid bucket boundary');
  }

  return {
    displayStart: new Date(startTimestamp).toISOString(),
    displayEnd: new Date(endTimestamp - 1).toISOString(),
  };
};
