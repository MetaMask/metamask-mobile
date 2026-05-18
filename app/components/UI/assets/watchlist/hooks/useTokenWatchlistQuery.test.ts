import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { readFromTokenWatchList } from '../storage';
import { getTokens } from '../utils/getTokens';
import { tokenWatchlistQueryKeys } from './useTokenWatchlist.keys';
import {
  useTokenWatchlistQuery,
  WATCHLIST_QUERY_STALE_TIME_MS,
} from './useTokenWatchlistQuery';

jest.mock('../storage', () => ({
  readFromTokenWatchList: jest.fn(),
}));

jest.mock('../utils/getTokens', () => ({
  getTokens: jest.fn(),
}));

let mockAssetsByChain: Record<string, unknown[]> = {};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (_selector: unknown) => mockAssetsByChain,
}));

const mockedReadFromTokenWatchList =
  readFromTokenWatchList as jest.MockedFunction<typeof readFromTokenWatchList>;
const mockedGetTokens = getTokens as jest.MockedFunction<typeof getTokens>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('useTokenWatchlistQuery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetsByChain = {};
  });

  it('exposes a 60s stale time matching the tech spec', () => {
    expect(WATCHLIST_QUERY_STALE_TIME_MS).toStrictEqual(60_000);
  });

  it('uses the structured `tokenWatchlist/blob` query key', async () => {
    const { Wrapper, queryClient } = createWrapper();
    mockedReadFromTokenWatchList.mockResolvedValue({
      assets: [],
      version: 1,
    });
    mockedGetTokens.mockResolvedValue([]);

    const { result } = renderHook(() => useTokenWatchlistQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toStrictEqual(true);
    });

    expect(
      queryClient.getQueryData(tokenWatchlistQueryKeys.blob),
    ).toStrictEqual([]);
  });

  it('returns an empty list and skips the network when storage is empty', async () => {
    const { Wrapper } = createWrapper();
    mockedReadFromTokenWatchList.mockResolvedValue({
      assets: [],
      version: 1,
    });
    mockedGetTokens.mockResolvedValue([]);

    const { result } = renderHook(() => useTokenWatchlistQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toStrictEqual(true);
    });

    expect(mockedGetTokens).not.toHaveBeenCalled();
    expect(result.current.data).toStrictEqual([]);
  });

  it('hydrates storage IDs into tokens via getTokens', async () => {
    const { Wrapper } = createWrapper();
    mockedReadFromTokenWatchList.mockResolvedValue({
      assets: ['eip155:1/slip44:60'],
      version: 1,
    });
    mockedGetTokens.mockResolvedValue([
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ]);

    const { result } = renderHook(() => useTokenWatchlistQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toStrictEqual(true);
    });

    expect(mockedGetTokens).toHaveBeenCalledWith(['eip155:1/slip44:60']);
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

  it('hydrates the user balance from controller state for watched tokens held by the wallet', async () => {
    mockAssetsByChain = {
      'eip155:1': [
        {
          assetId: 'eip155:1/slip44:60',
          balance: '1.234',
          fiat: { balance: 2468, currency: 'usd' },
        },
      ],
    };
    const { Wrapper } = createWrapper();
    mockedReadFromTokenWatchList.mockResolvedValue({
      assets: ['eip155:1/slip44:60'],
      version: 1,
    });
    mockedGetTokens.mockResolvedValue([
      {
        assetId: 'eip155:1/slip44:60',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    ]);

    const { result } = renderHook(() => useTokenWatchlistQuery(), {
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
        balance: '1.234',
        balanceFiat: 2468,
        fiatCurrency: 'usd',
        isInWallet: true,
      },
    ]);
  });

  it('surfaces storage errors through the query error state', async () => {
    const { Wrapper } = createWrapper();
    mockedReadFromTokenWatchList.mockRejectedValue(new Error('storage boom'));

    const { result } = renderHook(() => useTokenWatchlistQuery(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isError).toStrictEqual(true);
    });

    expect(result.current.error).toStrictEqual(new Error('storage boom'));
  });
});
