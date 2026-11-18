import type {
  Availability,
  InterestHistoryGranularity,
  InterestHistoryRange,
  InterestHistoryResponse,
  PeriodStatus,
  UnavailableReason,
} from '../../types/moneyInterestHistory';

const ISO_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T/;

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

  const amountUsd = Number(value);
  return Number.isFinite(amountUsd) ? amountUsd : undefined;
};

const isNullableFiniteUsd = (value: unknown): boolean =>
  value === null || parseFiniteUsd(value) !== undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

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

const hasOrderedTimestamps = (
  periodStart: unknown,
  periodEndExclusive: unknown,
): boolean => {
  const startTimestamp = getTimestamp(periodStart);
  const endTimestamp = getTimestamp(periodEndExclusive);
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

export const hasInvalidInterestHistoryResponse = (value: unknown): boolean => {
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
