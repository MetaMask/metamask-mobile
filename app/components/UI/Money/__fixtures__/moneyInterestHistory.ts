import type {
  InterestHistoryAvailability,
  InterestHistoryBucket,
  InterestHistoryGranularity,
  InterestHistoryRange,
  InterestHistoryRangeKey,
  InterestHistoryResponse,
  UnavailableReason,
} from '../types/moneyInterestHistory';

const available: InterestHistoryAvailability = {
  earnings: 'available',
  usd_pricing: 'available',
};

const unavailable: InterestHistoryAvailability = {
  earnings: 'unavailable',
  usd_pricing: 'unavailable',
};

interface CreateInterestHistoryBucketOptions {
  start?: string;
  end?: string;
  interestEarnedUsd?: string | null;
  availability?: InterestHistoryAvailability;
}

export const createInterestHistoryBucket = ({
  start = '2026-11-15T00:00:00.000Z',
  end,
  interestEarnedUsd = '1',
  availability = available,
}: CreateInterestHistoryBucketOptions = {}): InterestHistoryBucket => {
  const resolvedEnd =
    end ?? new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString();

  return {
    start,
    end: resolvedEnd,
    period_status: 'complete',
    availability,
    unavailable_reasons:
      availability.earnings === 'available'
        ? []
        : ['before_user_earnings_inception'],
    interest_earned_musd_assets: interestEarnedUsd,
    interest_earned_usd: interestEarnedUsd,
    musd_price_usd: availability.usd_pricing === 'available' ? '1' : null,
    price_as_of: availability.usd_pricing === 'available' ? start : null,
    price_source:
      availability.usd_pricing === 'available' ? 'metamask_price_api' : null,
    by_vault: [],
  };
};

interface CreateInterestHistoryRangeOptions {
  range: InterestHistoryRangeKey;
  granularity?: InterestHistoryGranularity;
  buckets?: InterestHistoryBucket[];
  total?: string | null;
  rangeStart?: string;
  rangeEnd?: string;
  availability?: InterestHistoryAvailability;
  unavailableReasons?: UnavailableReason[];
}

export const createInterestHistoryRange = ({
  range,
  granularity = range === '7d' ? 'day' : range === '30d' ? 'week' : 'month',
  buckets = [],
  total = '99',
  rangeStart,
  rangeEnd,
  availability = available,
  unavailableReasons = [],
}: CreateInterestHistoryRangeOptions): InterestHistoryRange => ({
  range,
  granularity,
  range_start: rangeStart ?? buckets[0]?.start ?? '2026-11-15T00:00:00.000Z',
  range_end: rangeEnd ?? buckets.at(-1)?.end ?? '2026-11-16T00:00:00.000Z',
  period_status: 'partial',
  availability,
  unavailable_reasons: unavailableReasons,
  totals: {
    interest_earned_musd_assets: total,
    interest_earned_usd: total,
  },
  buckets,
});

const createDefaultRanges = (): InterestHistoryRange[] => [
  createInterestHistoryRange({
    range: '7d',
    buckets: [
      createInterestHistoryBucket({
        start: '2026-11-15T00:00:00.000Z',
        interestEarnedUsd: '10',
      }),
    ],
    total: '10',
  }),
  createInterestHistoryRange({
    range: '30d',
    buckets: [
      createInterestHistoryBucket({
        start: '2026-10-18T00:00:00.000Z',
        interestEarnedUsd: '20',
        end: '2026-10-25T00:00:00.000Z',
      }),
      createInterestHistoryBucket({
        start: '2026-11-08T00:00:00.000Z',
        interestEarnedUsd: null,
        availability: unavailable,
        end: '2026-11-15T00:00:00.000Z',
      }),
      createInterestHistoryBucket({
        start: '2026-11-15T00:00:00.000Z',
        interestEarnedUsd: '10',
      }),
    ],
    total: '30',
  }),
  createInterestHistoryRange({
    range: '90d',
    buckets: [
      createInterestHistoryBucket({
        start: '2026-11-15T00:00:00.000Z',
        interestEarnedUsd: '10',
      }),
    ],
    total: '10',
  }),
  createInterestHistoryRange({
    range: '180d',
    buckets: [
      createInterestHistoryBucket({
        start: '2026-01-01T00:00:00.000Z',
        interestEarnedUsd: '70',
      }),
      createInterestHistoryBucket({
        start: '2026-11-15T00:00:00.000Z',
        interestEarnedUsd: '10',
      }),
    ],
    total: '80',
  }),
  createInterestHistoryRange({
    range: '365d',
    buckets: [
      createInterestHistoryBucket({
        start: '2026-01-01T00:00:00.000Z',
        interestEarnedUsd: '70',
      }),
      createInterestHistoryBucket({
        start: '2026-10-18T00:00:00.000Z',
        interestEarnedUsd: '20',
      }),
      createInterestHistoryBucket({
        start: '2026-11-15T00:00:00.000Z',
        interestEarnedUsd: '10',
      }),
    ],
    total: '100',
  }),
];

interface CreateInterestHistoryResponseOptions {
  address?: string;
  ranges?: InterestHistoryRange[];
}

export const createInterestHistoryResponse = ({
  address = '0x1234567890abcdef1234567890abcdef12345678',
  ranges = createDefaultRanges(),
}: CreateInterestHistoryResponseOptions = {}): InterestHistoryResponse => ({
  address,
  chain_id: 143,
  bucket_timezone: 'UTC',
  updated_through: '2026-11-16T16:02:44.000Z',
  source_watermark: {
    vault_accounting: {
      block_number: '122782198',
      block_timestamp: '2026-11-16T16:02:44.000Z',
    },
  },
  method: 'nav_difference',
  denomination: {
    asset: 'mUSD',
    decimals: 6,
  },
  ranges,
});

export const moneyHistoricalEarningsResponse = createInterestHistoryResponse();

export const withRangeOverride = (
  response: InterestHistoryResponse,
  rangeKey: InterestHistoryRangeKey,
  override: (range: InterestHistoryRange) => InterestHistoryRange,
): InterestHistoryResponse => ({
  ...response,
  ranges: response.ranges.map((range) =>
    range.range === rangeKey ? override(range) : range,
  ),
});
