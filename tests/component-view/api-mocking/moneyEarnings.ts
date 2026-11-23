import type {
  InterestHistoryAvailability,
  InterestHistoryBucket,
  InterestHistoryRange,
  InterestHistoryResponse,
} from '../../../app/components/UI/Money/types/moneyInterestHistory';
import { restoreFetchPath, stubFetchPath } from './fetchStub';

const MONEY_EARNINGS_PATH =
  '/v1/positions/0x1234567890abcdef1234567890abcdef12345678/interest-history';
const MONEY_EARNINGS_ORIGINS = [
  'https://money.dev-api.cx.metamask.io',
  'https://money.uat-api.cx.metamask.io',
  'https://money.api.cx.metamask.io',
] as const;

const available: InterestHistoryAvailability = {
  earnings: 'available',
  usd_pricing: 'available',
};

const unavailable: InterestHistoryAvailability = {
  earnings: 'unavailable',
  usd_pricing: 'unavailable',
};

const createBucket = (
  start: string,
  amountUsd: string | null,
  bucketAvailability: InterestHistoryAvailability = available,
  end = new Date(Date.parse(start) + 24 * 60 * 60 * 1000).toISOString(),
): InterestHistoryBucket => ({
  start,
  end,
  period_status: 'complete',
  availability: bucketAvailability,
  unavailable_reasons:
    bucketAvailability.earnings === 'available'
      ? []
      : ['before_user_earnings_inception'],
  interest_earned_musd_assets: amountUsd,
  interest_earned_usd: amountUsd,
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
  granularity: InterestHistoryRange['granularity'],
  buckets: InterestHistoryBucket[],
  total: string | null,
): InterestHistoryRange => ({
  range,
  granularity,
  range_start: buckets[0]?.start ?? '2026-11-15T00:00:00.000Z',
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

export const moneyHistoricalEarningsResponse: InterestHistoryResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
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
  ranges: [
    createRange(
      '7d',
      'day',
      [createBucket('2026-11-15T00:00:00.000Z', '10')],
      '10',
    ),
    createRange(
      '30d',
      'week',
      [
        createBucket(
          '2026-10-18T00:00:00.000Z',
          '20',
          available,
          '2026-10-25T00:00:00.000Z',
        ),
        createBucket(
          '2026-11-08T00:00:00.000Z',
          null,
          unavailable,
          '2026-11-15T00:00:00.000Z',
        ),
        createBucket('2026-11-15T00:00:00.000Z', '10'),
      ],
      '30',
    ),
    createRange(
      '90d',
      'month',
      [createBucket('2026-11-15T00:00:00.000Z', '10')],
      '10',
    ),
    createRange(
      '180d',
      'month',
      [
        createBucket('2026-01-01T00:00:00.000Z', '70'),
        createBucket('2026-11-15T00:00:00.000Z', '10'),
      ],
      '80',
    ),
    createRange(
      '365d',
      'month',
      [
        createBucket('2026-01-01T00:00:00.000Z', '70'),
        createBucket('2026-10-18T00:00:00.000Z', '20'),
        createBucket('2026-11-15T00:00:00.000Z', '10'),
      ],
      '100',
    ),
  ],
};

interface SetupMoneyEarningsApiMockOptions {
  response?: InterestHistoryResponse | Record<string, unknown>;
  status?: number;
  onRequest?: (url: string) => void;
}

export const setupMoneyEarningsApiMock = ({
  response = moneyHistoricalEarningsResponse,
  status = 200,
  onRequest,
}: SetupMoneyEarningsApiMockOptions = {}): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    stubFetchPath(origin, MONEY_EARNINGS_PATH, response, status, {
      method: 'GET',
      onRequest: ({ url }) => onRequest?.(url),
    });
  });
};

export const clearMoneyEarningsApiMocks = (): void => {
  MONEY_EARNINGS_ORIGINS.forEach((origin) => {
    restoreFetchPath(origin, MONEY_EARNINGS_PATH, { method: 'GET' });
  });
};
