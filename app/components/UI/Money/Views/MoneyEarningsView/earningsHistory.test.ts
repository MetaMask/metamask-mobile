import type {
  InterestHistoryBucket,
  InterestHistoryRange,
  InterestHistoryResponse,
} from '../../types/moneyInterestHistory';
import {
  EARNINGS_RANGES,
  getAuthoritativeRangeTotalUsd,
  getBucketDisplayDateRange,
  getBucketPoints,
  getLatestAvailableBucketIndex,
  getSelectedRange,
  type EarningsRange,
} from './earningsHistory';
import {
  hasInvalidInterestHistoryResponse,
  parseFiniteUsd,
} from './earningsHistoryValidation';

const available = {
  earnings: 'available',
  usd_pricing: 'available',
} as const;

const createBucket = ({
  start,
  end,
  interestEarnedUsd = '1',
  bucketAvailability = available,
}: {
  start: string;
  end: string;
  interestEarnedUsd?: string | null;
  bucketAvailability?: InterestHistoryBucket['availability'];
}): InterestHistoryBucket => ({
  start,
  end,
  period_status: 'complete',
  availability: bucketAvailability,
  unavailable_reasons:
    bucketAvailability.earnings === 'available'
      ? []
      : ['before_user_earnings_inception'],
  interest_earned_musd_assets: interestEarnedUsd,
  interest_earned_usd: interestEarnedUsd,
  musd_price_usd: bucketAvailability.usd_pricing === 'available' ? '1' : null,
  price_as_of: bucketAvailability.usd_pricing === 'available' ? start : null,
  price_source:
    bucketAvailability.usd_pricing === 'available'
      ? 'metamask_price_api'
      : null,
  by_vault: [],
});

const createRange = (
  range: InterestHistoryRange['range'],
  buckets: InterestHistoryBucket[],
  total = '99',
): InterestHistoryRange => ({
  range,
  granularity: range === '7d' ? 'day' : 'week',
  range_start: buckets[0]?.start ?? '2026-11-09T00:00:00.000Z',
  range_end: buckets.at(-1)?.end ?? '2026-11-16T00:00:00.000Z',
  period_status: 'partial',
  availability: available,
  unavailable_reasons: [],
  totals: {
    interest_earned_musd_assets: total,
    interest_earned_usd: total,
  },
  buckets,
});

const createResponse = (
  ranges: InterestHistoryRange[] = [
    createRange('7d', [
      createBucket({
        start: '2026-11-09T00:00:00.000Z',
        end: '2026-11-10T00:00:00.000Z',
      }),
    ]),
  ],
): InterestHistoryResponse => ({
  address: '0x1234',
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

describe('earningsHistory', () => {
  it('keeps compact ranges from shortest to longest', () => {
    const expectedRanges = [
      '1W',
      '30D',
      '3M',
      '6M',
      '1Y',
    ] satisfies readonly EarningsRange[];

    expect(EARNINGS_RANGES).toEqual(expectedRanges);
  });

  it('selects the API range without inferring dates or granularity', () => {
    const response = createResponse([
      createRange(
        '30d',
        [
          createBucket({
            start: '2026-10-17T00:00:00.000Z',
            end: '2026-10-19T00:00:00.000Z',
          }),
        ],
        '2.664489',
      ),
    ]);

    const result = getSelectedRange(response, '30D');

    expect(result?.granularity).toBe('week');
    expect(result?.range_start).toBe('2026-10-17T00:00:00.000Z');
    expect(result?.range_end).toBe('2026-10-19T00:00:00.000Z');
  });

  it('preserves every bucket, including zero and unavailable buckets', () => {
    const range = createRange('7d', [
      createBucket({
        start: '2026-11-09T00:00:00.000Z',
        end: '2026-11-10T00:00:00.000Z',
        interestEarnedUsd: '0',
      }),
      createBucket({
        start: '2026-11-10T00:00:00.000Z',
        end: '2026-11-11T00:00:00.000Z',
        interestEarnedUsd: null,
        bucketAvailability: {
          earnings: 'not_applicable',
          usd_pricing: 'not_applicable',
        },
      }),
      createBucket({
        start: '2026-11-11T00:00:00.000Z',
        end: '2026-11-12T00:00:00.000Z',
        interestEarnedUsd: '2.5',
      }),
    ]);

    const result = getBucketPoints(range);

    expect(result).toHaveLength(3);
    expect(result.map(({ amountUsd }) => amountUsd)).toEqual([0, null, 2.5]);
    expect(result.map(({ start }) => start)).toEqual(
      range.buckets.map(({ start }) => start),
    );
  });

  it('parses only finite, non-empty USD strings', () => {
    expect(parseFiniteUsd('0')).toBe(0);
    expect(parseFiniteUsd('-1.25')).toBe(-1.25);
    expect(parseFiniteUsd('')).toBeUndefined();
    expect(parseFiniteUsd('NaN')).toBeUndefined();
    expect(parseFiniteUsd('Infinity')).toBeUndefined();
    expect(parseFiniteUsd(null)).toBeUndefined();
  });

  it('uses the authoritative range total instead of summing buckets', () => {
    const range = createRange(
      '30d',
      [
        createBucket({
          start: '2026-11-09T00:00:00.000Z',
          end: '2026-11-16T00:00:00.000Z',
          interestEarnedUsd: '2',
        }),
      ],
      '99',
    );

    expect(getAuthoritativeRangeTotalUsd(range)).toBe(99);
  });

  it('finds the latest available bucket while keeping zero available', () => {
    const range = createRange('7d', [
      createBucket({
        start: '2026-11-09T00:00:00.000Z',
        end: '2026-11-10T00:00:00.000Z',
        interestEarnedUsd: '0',
      }),
      createBucket({
        start: '2026-11-10T00:00:00.000Z',
        end: '2026-11-11T00:00:00.000Z',
        interestEarnedUsd: null,
        bucketAvailability: {
          earnings: 'unavailable',
          usd_pricing: 'unavailable',
        },
      }),
    ]);

    expect(getLatestAvailableBucketIndex(getBucketPoints(range))).toBe(0);
  });

  it('converts exclusive bucket ends into display boundaries', () => {
    const point = {
      start: '2026-11-09T00:00:00.000Z',
      periodEndExclusive: '2026-11-16T00:00:00.000Z',
    };

    expect(getBucketDisplayDateRange(point)).toEqual({
      displayStart: '2026-11-09T00:00:00.000Z',
      displayEnd: '2026-11-15T23:59:59.999Z',
    });
  });

  it('accepts a complete full-contract response', () => {
    expect(hasInvalidInterestHistoryResponse(createResponse())).toBe(false);
  });

  it.each([
    'missing address',
    'invalid updated_through',
    'invalid bucket amount',
    'invalid bucket boundary',
  ])('rejects malformed response: %s', (caseName) => {
    const response = createResponse();

    if (caseName === 'missing address') {
      delete (response as unknown as Record<string, unknown>).address;
    }
    if (caseName === 'invalid updated_through') {
      response.updated_through = 'not-a-date';
    }
    if (caseName === 'invalid bucket amount') {
      response.ranges[0].buckets[0].interest_earned_usd = 'Infinity';
    }
    if (caseName === 'invalid bucket boundary') {
      response.ranges[0].buckets[0].end = 'not-a-date';
    }

    expect(hasInvalidInterestHistoryResponse(response)).toBe(true);
  });
});
