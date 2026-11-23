import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { ApiEnv } from '../../../../core/apiEnv';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MoneyQueryKeys } from '../queryKeys';
import { fetchMoneyInterestHistory } from '../services/moneyInterestHistory';
import type { InterestHistoryResponse } from '../types/moneyInterestHistory';
import { useMoneyHistoricalEarnings } from './useMoneyHistoricalEarnings';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyAccountVaultConfig: jest.fn(),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockUseQuery = jest.mocked(useQuery);

const MOCK_ADDRESS = '0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B';
const MOCK_CHAIN_ID = 143;
const MOCK_RESPONSE: InterestHistoryResponse = {
  address: MOCK_ADDRESS.toLowerCase(),
  chain_id: MOCK_CHAIN_ID,
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
    {
      range: '30d',
      granularity: 'week',
      range_start: '2026-10-17T00:00:00.000Z',
      range_end: '2026-11-16T00:00:00.000Z',
      period_status: 'partial',
      availability: {
        earnings: 'available',
        usd_pricing: 'available',
      },
      unavailable_reasons: [],
      totals: {
        interest_earned_musd_assets: '2665076',
        interest_earned_usd: '2.664489',
      },
      buckets: [
        {
          start: '2026-11-09T00:00:00.000Z',
          end: '2026-11-16T00:00:00.000Z',
          period_status: 'complete',
          availability: {
            earnings: 'available',
            usd_pricing: 'available',
          },
          unavailable_reasons: [],
          interest_earned_musd_assets: '620790',
          interest_earned_usd: '12.34',
          musd_price_usd: '0.999796291580000000',
          price_as_of: '2026-11-15T00:00:00.000Z',
          price_source: 'metamask_price_api',
          by_vault: [
            {
              vault_key: 'standard',
              vault_address: '0x1c8a336051d2024e318a229d01f9f6cf96efd316',
              period_status: 'complete',
              availability: {
                earnings: 'available',
                usd_pricing: 'available',
              },
              unavailable_reasons: [],
              interest_earned_musd_assets: '620790',
              interest_earned_usd: '12.34',
            },
          ],
        },
      ],
    },
  ],
};

const setSelectors = ({
  address = MOCK_ADDRESS,
  chainId = '0x8f',
}: {
  address?: string;
  chainId?: string;
} = {}): void => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectPrimaryMoneyAccount) {
      return address ? { address } : undefined;
    }

    if (selector === selectMoneyAccountVaultConfig) {
      return chainId === undefined ? undefined : { chainId };
    }

    return undefined;
  });
};

describe('useMoneyHistoricalEarnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSelectors();
    mockUseQuery.mockReturnValue({} as never);
  });

  it('queries historical earnings with normalized account and chain ID', () => {
    renderHook(() => useMoneyHistoricalEarnings());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: [
          MoneyQueryKeys.FETCH_INTEREST_HISTORY,
          MOCK_ADDRESS.toLowerCase(),
          MOCK_CHAIN_ID,
        ],
        enabled: true,
      }),
    );
  });

  it('combines account readiness with the enabled option', () => {
    renderHook(() => useMoneyHistoricalEarnings({ enabled: false }));

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query when the account address is unavailable', () => {
    setSelectors({ address: '' });

    renderHook(() => useMoneyHistoricalEarnings());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('disables the query when the vault chain ID is invalid', () => {
    setSelectors({ chainId: 'invalid' });

    renderHook(() => useMoneyHistoricalEarnings());

    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});

describe('fetchMoneyInterestHistory', () => {
  const originalApiEnv = process.env.MM_API_ENV;
  const originalFetch = global.fetch;

  afterEach(() => {
    process.env.MM_API_ENV = originalApiEnv;
    global.fetch = originalFetch;
  });

  it.each([
    [ApiEnv.Dev, 'https://money.dev-api.cx.metamask.io'],
    [ApiEnv.Uat, 'https://money.uat-api.cx.metamask.io'],
    [ApiEnv.Prod, 'https://money.api.cx.metamask.io'],
  ])(
    'fetches from the %s Money API without an auth header',
    async (apiEnv, baseUrl) => {
      process.env.MM_API_ENV = apiEnv;
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => MOCK_RESPONSE,
      });
      global.fetch = mockFetch;

      await fetchMoneyInterestHistory(MOCK_ADDRESS, MOCK_CHAIN_ID);

      expect(mockFetch).toHaveBeenCalledWith(
        `${baseUrl}/v1/positions/${MOCK_ADDRESS.toLowerCase()}/interest-history?chain_id=${MOCK_CHAIN_ID}`,
      );
    },
  );

  it('returns the decoded response from a successful request', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESPONSE,
    });
    global.fetch = mockFetch;

    await expect(
      fetchMoneyInterestHistory(MOCK_ADDRESS, MOCK_CHAIN_ID),
    ).resolves.toEqual(MOCK_RESPONSE);
  });

  it('rejects when the API responds with a non-2xx status', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });
    global.fetch = mockFetch;

    await expect(
      fetchMoneyInterestHistory(MOCK_ADDRESS, MOCK_CHAIN_ID),
    ).rejects.toThrow('Money Account API interest history request failed');
  });
});
