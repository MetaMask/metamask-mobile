import type {
  Availability,
  InterestHistoryAvailability,
  InterestHistoryBucket,
  InterestHistoryGranularity,
  InterestHistoryRange,
  InterestHistoryResponse,
  PeriodStatus,
  UnavailableReason,
} from '../../hooks/useMoneyHistoricalEarnings';

export type EarningsRange = '1W' | '30D' | '3M' | '6M' | '1Y';

export interface EarningsPoint {
  start: string;
  end: string;
  timestamp: string;
  amount: number | null;
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

export const parseFiniteUsd = (value: unknown): number | undefined => {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
};

const isNullableFiniteUsd = (value: unknown): boolean =>
  value === null || parseFiniteUsd(value) !== undefined;

const isEnumValue = <Value extends string>(
  value: unknown,
  values: readonly Value[],
): value is Value =>
  typeof value === 'string' && values.includes(value as Value);

const PERIOD_STATUSES = [
  'complete',
  'partial',
  'not_applicable',
] as const satisfies readonly PeriodStatus[];

const AVAILABILITIES = [
  'available',
  'unavailable',
  'not_applicable',
] as const satisfies readonly Availability[];

const GRANULARITIES = [
  'day',
  'week',
  'month',
] as const satisfies readonly InterestHistoryGranularity[];

const RANGE_KEYS = [
  '7d',
  '30d',
  '90d',
  '180d',
  '365d',
] as const satisfies readonly InterestHistoryRange['range'][];

const UNAVAILABLE_REASONS = [
  'insufficient_cash_flow_history',
  'cash_flow_replay_invariant_failed',
  'historical_accountant_rate_unavailable',
  'vault_accounting_not_finalized',
  'before_user_earnings_inception',
  'historical_price_missing',
  'historical_price_stale',
] as const satisfies readonly UnavailableReason[];

const isAvailability = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isEnumValue(value.earnings, AVAILABILITIES) &&
    isEnumValue(value.usd_pricing, AVAILABILITIES)
  );
};

const isEarningsShape = (value: unknown): boolean => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isEnumValue(value.period_status, PERIOD_STATUSES) &&
    isAvailability(value.availability) &&
    Array.isArray(value.unavailable_reasons) &&
    value.unavailable_reasons.every((reason) =>
      isEnumValue(reason, UNAVAILABLE_REASONS),
    ) &&
    isNullableFiniteUsd(value.interest_earned_musd_assets) &&
    isNullableFiniteUsd(value.interest_earned_usd)
  );
};

const isPerVaultShape = (value: unknown): boolean => {
  if (
    !isEarningsShape(value) ||
    !isRecord(value) ||
    typeof value.vault_key !== 'string' ||
    typeof value.vault_address !== 'string'
  ) {
    return false;
  }

  return true;
};

const hasOrderedTimestamps = (start: unknown, end: unknown): boolean => {
  const startTimestamp = getTimestamp(start);
  const endTimestamp = getTimestamp(end);
  return (
    startTimestamp !== undefined &&
    endTimestamp !== undefined &&
    endTimestamp > startTimestamp
  );
};

const isBucketShape = (value: unknown): boolean => {
  if (
    !isEarningsShape(value) ||
    !isRecord(value) ||
    typeof value.start !== 'string' ||
    typeof value.end !== 'string' ||
    !hasOrderedTimestamps(value.start, value.end) ||
    !isNullableFiniteUsd(value.musd_price_usd) ||
    (value.price_as_of !== null &&
      getTimestamp(value.price_as_of) === undefined) ||
    (value.price_source !== null &&
      value.price_source !== 'metamask_price_api') ||
    !Array.isArray(value.by_vault)
  ) {
    return false;
  }

  return value.by_vault.every(isPerVaultShape);
};

const isRangeShape = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    !isEnumValue(value.range, RANGE_KEYS) ||
    !isEnumValue(value.granularity, GRANULARITIES) ||
    !hasOrderedTimestamps(value.range_start, value.range_end) ||
    !isEnumValue(value.period_status, PERIOD_STATUSES) ||
    !isAvailability(value.availability) ||
    !Array.isArray(value.unavailable_reasons) ||
    !value.unavailable_reasons.every((reason) =>
      isEnumValue(reason, UNAVAILABLE_REASONS),
    ) ||
    !isRecord(value.totals) ||
    !isNullableFiniteUsd(value.totals.interest_earned_musd_assets) ||
    !isNullableFiniteUsd(value.totals.interest_earned_usd) ||
    !Array.isArray(value.buckets)
  ) {
    return false;
  }

  return value.buckets.every(isBucketShape);
};

export const getSelectedRange = (
  response: InterestHistoryResponse | undefined,
  range: EarningsRange,
): InterestHistoryRange | undefined =>
  response?.ranges.find(
    ({ range: candidateRange }) => candidateRange === RANGE_CONFIG[range],
  );

export const hasInvalidHistoryEntries = (value: unknown): boolean => {
  if (
    !isRecord(value) ||
    typeof value.address !== 'string' ||
    typeof value.chain_id !== 'number' ||
    !Number.isSafeInteger(value.chain_id) ||
    value.bucket_timezone !== 'UTC' ||
    getTimestamp(value.updated_through) === undefined ||
    !isRecord(value.source_watermark) ||
    !isRecord(value.source_watermark.vault_accounting) ||
    typeof value.source_watermark.vault_accounting.block_number !== 'string' ||
    getTimestamp(value.source_watermark.vault_accounting.block_timestamp) ===
      undefined ||
    value.method !== 'nav_difference' ||
    !isRecord(value.denomination) ||
    value.denomination.asset !== 'mUSD' ||
    value.denomination.decimals !== 6 ||
    !Array.isArray(value.ranges)
  ) {
    return true;
  }

  return value.ranges.some((range) => !isRangeShape(range));
};

const getBucketAmount = (bucket: InterestHistoryBucket): number | null => {
  if (bucket.interest_earned_usd === null) {
    return null;
  }

  const amount = parseFiniteUsd(bucket.interest_earned_usd);
  if (amount === undefined) {
    throw new Error('Historical earnings contains an invalid USD amount');
  }
  return amount;
};

export const getBucketPoints = (
  selectedRange: InterestHistoryRange | undefined,
): EarningsPoint[] =>
  selectedRange?.buckets.map((bucket) => ({
    start: bucket.start,
    end: bucket.end,
    timestamp: bucket.start,
    amount: getBucketAmount(bucket),
    granularity: selectedRange.granularity,
    periodStatus: bucket.period_status,
    availability: bucket.availability,
    unavailableReasons: bucket.unavailable_reasons,
  })) ?? [];

export const isAvailableBucket = (point: EarningsPoint): boolean =>
  point.amount !== null &&
  point.availability.earnings === 'available' &&
  point.availability.usd_pricing === 'available';

export const getAuthoritativeRangeTotal = (
  selectedRange: InterestHistoryRange | undefined,
): number | undefined => {
  const serializedTotal = selectedRange?.totals.interest_earned_usd;
  if (serializedTotal === undefined || serializedTotal === null) {
    return undefined;
  }

  const total = parseFiniteUsd(serializedTotal);
  if (total === undefined) {
    throw new Error('Historical earnings contains an invalid range total');
  }
  return total;
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
  start: string;
  end: string;
}

export const getBucketDisplayDateRange = (
  point: Pick<EarningsPoint, 'start' | 'end'>,
): EarningsDisplayDateRange => {
  const startTimestamp = getTimestamp(point.start);
  const endTimestamp = getTimestamp(point.end);

  if (startTimestamp === undefined || endTimestamp === undefined) {
    throw new Error('Historical earnings contains an invalid bucket boundary');
  }

  return {
    start: new Date(startTimestamp).toISOString(),
    end: new Date(endTimestamp - 1).toISOString(),
  };
};

// Compatibility exports used by the current screen until its integration task.
export const getRangeEntries = (
  response: InterestHistoryResponse | readonly [],
  range: EarningsRange,
): InterestHistoryBucket[] => {
  if (Array.isArray(response)) {
    return [];
  }

  return (
    getSelectedRange(response as InterestHistoryResponse, range)?.buckets ?? []
  );
};

export const getDailyEarningsPoints = (
  entries: InterestHistoryBucket[],
  _range?: EarningsRange,
): { timestamp: string; amount: number | null }[] =>
  entries.map((bucket) => ({
    timestamp: bucket.start,
    amount: getBucketAmount(bucket),
  }));

export const sumEarnings = (entries: InterestHistoryBucket[]): number =>
  entries.reduce((total, entry) => total + (getBucketAmount(entry) ?? 0), 0);
