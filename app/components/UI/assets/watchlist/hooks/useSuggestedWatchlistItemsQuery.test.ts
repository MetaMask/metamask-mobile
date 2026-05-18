import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { getTokens } from '../utils/getTokens';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';
import {
  SUGGESTED_WATCHLIST_ASSET_IDS,
  useSuggestedWatchlistItemsQuery,
} from './useSuggestedWatchlistItemsQuery';

jest.mock('../utils/getTokens', () => ({
  getTokens: jest.fn(),
}));

let mockAssetsByChain: Record<string, unknown[]> = {};
let mockIsWatchlistEnabled = true;

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: (selector: unknown) => {
      const {
        selectTokenWatchlistEnabled: enabledSelector,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../../selectors/featureFlags');
      const {
        selectAssetsBySelectedAccountGroup: assetsSelector,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../../../../../selectors/assets/assets-list');
      if (selector === enabledSelector) {
        return mockIsWatchlistEnabled;
      }
      if (selector === assetsSelector) {
        return mockAssetsByChain;
      }
      return undefined;
    },
  };
});

const mockedGetTokens = getTokens as jest.MockedFunction<typeof getTokens>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useSuggestedWatchlistItemsQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetsByChain = {};
    mockIsWatchlistEnabled = true;
  });

  it('exposes the three curated mainnet native asset IDs (ETH/BTC/SOL)', () => {
    expect(SUGGESTED_WATCHLIST_ASSET_IDS).toStrictEqual([
      'eip155:1/slip44:60',
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
    ]);
  });

  it('fetches the curated asset IDs and caches under the suggested key', async () => {
    const { Wrapper, queryClient } = createWrapper();
    mockedGetTokens.mockResolvedValue([
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
      {
        assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
        symbol: 'BTC',
        name: 'Bitcoin',
        decimals: 8,
      },
      {
        assetId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        symbol: 'SOL',
        name: 'Solana',
        decimals: 9,
      },
    ]);

    const { result } = renderHook(() => useSuggestedWatchlistItemsQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toStrictEqual(true);
    });

    expect(mockedGetTokens).toHaveBeenCalledWith(SUGGESTED_WATCHLIST_ASSET_IDS);
    expect(result.current.data?.map((t) => t.symbol)).toStrictEqual([
      'ETH',
      'BTC',
      'SOL',
    ]);
    expect(
      queryClient.getQueryData(tokenWatchlistQueryKeys.suggested),
    ).toBeDefined();
  });

  it('defaults balance to zero for suggested tokens the user does not hold', async () => {
    const { Wrapper } = createWrapper();
    mockedGetTokens.mockResolvedValue([
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ]);

    const { result } = renderHook(() => useSuggestedWatchlistItemsQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toStrictEqual(true);
    });

    expect(result.current.data).toStrictEqual([
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
        balance: '0',
        balanceFiat: undefined,
        fiatCurrency: undefined,
        isInWallet: false,
      },
    ]);
  });

  it('hydrates balance from controller state when the user holds the suggested token', async () => {
    mockAssetsByChain = {
      'eip155:1': [
        {
          assetId: 'eip155:1/slip44:60',
          balance: '0.5',
          fiat: { balance: 1500, currency: 'usd' },
        },
      ],
    };
    const { Wrapper } = createWrapper();
    mockedGetTokens.mockResolvedValue([
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ]);

    const { result } = renderHook(() => useSuggestedWatchlistItemsQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toStrictEqual(true);
    });

    expect(result.current.data?.[0]).toStrictEqual({
      assetId: 'eip155:1/slip44:60',
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18,
      balance: '0.5',
      balanceFiat: 1500,
      fiatCurrency: 'usd',
      isInWallet: true,
    });
  });

  it('surfaces network errors through the query error state', async () => {
    const { Wrapper } = createWrapper();
    mockedGetTokens.mockRejectedValue(new Error('network boom'));

    const { result } = renderHook(() => useSuggestedWatchlistItemsQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toStrictEqual(true);
    });

    expect(result.current.error).toStrictEqual(new Error('network boom'));
  });

  describe('when the watchlist feature flag is disabled', () => {
    beforeEach(() => {
      mockIsWatchlistEnabled = false;
    });

    it('keeps the query disabled and never hits the Token API', () => {
      const { Wrapper } = createWrapper();
      mockedGetTokens.mockResolvedValue([
        {
          assetId: 'eip155:1/slip44:60',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
        },
      ]);

      const { result } = renderHook(() => useSuggestedWatchlistItemsQuery(), {
        wrapper: Wrapper,
      });

      // TanStack Query v4 reports `status: 'loading'` whenever data is
      // undefined, so the canonical "disabled" signal is `fetchStatus`
      // plus the queryFn never being called.
      expect(result.current.fetchStatus).toStrictEqual('idle');
      expect(result.current.isFetching).toStrictEqual(false);
      expect(result.current.data).toBeUndefined();
      expect(mockedGetTokens).not.toHaveBeenCalled();
    });
  });
});
