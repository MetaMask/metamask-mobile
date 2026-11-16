import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingChainIds } from '../../../../UI/Trending/hooks/useTrendingChainIds/useTrendingChainIds';
import { useTokenWatchlistQuery } from '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistQuery';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectTokenWatchlistEnabled } from '../../../../UI/Assets/selectors/featureFlags';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { fetchCryptoPillTokens } from './cryptoPillApi';
import type { CryptoPillKey } from './cryptoPillConfig';
import { useCryptoPillFeed } from './useCryptoPillFeed';

jest.mock('./cryptoPillApi', () => ({
  ...jest.requireActual('./cryptoPillApi'),
  fetchCryptoPillTokens: jest.fn(),
}));

jest.mock(
  '../../../../UI/Trending/hooks/useTrendingChainIds/useTrendingChainIds',
  () => ({
    useTrendingChainIds: jest.fn(() => ['eip155:1', 'eip155:137']),
  }),
);

jest.mock(
  '../../../../UI/Assets/watchlist/hooks/useTokenWatchlistQuery',
  () => ({
    useTokenWatchlistQuery: jest.fn(),
  }),
);

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

let mockIsWatchlistEnabled = false;

jest.mock('react-redux', () => {
  const actual = jest.requireActual('react-redux');
  return {
    ...actual,
    useSelector: (selector: unknown) => {
      const {
        selectCurrentCurrency: currencySelector,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../../../../../selectors/currencyRateController');
      const {
        selectTokenWatchlistEnabled: enabledSelector,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require('../../../../UI/Assets/selectors/featureFlags');
      if (selector === currencySelector) {
        return 'usd';
      }
      if (selector === enabledSelector) {
        return mockIsWatchlistEnabled;
      }
      return undefined;
    },
  };
});

const mockedFetchCryptoPillTokens =
  fetchCryptoPillTokens as jest.MockedFunction<typeof fetchCryptoPillTokens>;
const mockedUseTokenWatchlistQuery =
  useTokenWatchlistQuery as jest.MockedFunction<typeof useTokenWatchlistQuery>;
const mockedUseTrendingChainIds = useTrendingChainIds as jest.MockedFunction<
  typeof useTrendingChainIds
>;

const makeToken = (
  symbol: string,
  overrides: Partial<TrendingAsset> = {},
): TrendingAsset =>
  ({
    assetId: `eip155:1/erc20:0x${symbol.toLowerCase()}`,
    name: `${symbol} Token`,
    symbol,
    decimals: 18,
    ...overrides,
  }) as TrendingAsset;

const makeWatchlistToken = (symbol: string) =>
  ({
    assetId: `eip155:1/erc20:0x${symbol.toLowerCase()}`,
    name: `${symbol} Token`,
    symbol,
    decimals: 18,
  }) as NonNullable<
    ReturnType<typeof mockedUseTokenWatchlistQuery>['data']
  >[number];

interface FeedHookProps {
  activePillKey?: CryptoPillKey;
  refresh?: RefreshConfig;
}

const renderFeed = (initialProps: FeedHookProps = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  const rendered = renderHook(
    ({ activePillKey, refresh }: FeedHookProps) =>
      useCryptoPillFeed({
        activePillKey: activePillKey ?? 'trending',
        refresh,
      }),
    {
      wrapper: Wrapper,
      initialProps,
    },
  );
  return { ...rendered, queryClient };
};

const isGlobalTrendingRequest = (request: {
  path: string;
  chainIds: string[];
}): boolean =>
  request.path === '/v3/tokens/trending' &&
  request.chainIds.join(',') === 'eip155:1,eip155:137';

describe('useCryptoPillFeed', () => {
  let resolveActiveFetch: ((tokens: TrendingAsset[]) => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsWatchlistEnabled = false;
    mockedUseTrendingChainIds.mockReturnValue(['eip155:1', 'eip155:137']);
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: jest.fn().mockResolvedValue(undefined),
    } as never);
    resolveActiveFetch = undefined;
    mockedFetchCryptoPillTokens.mockImplementation(async (request) => {
      if (isGlobalTrendingRequest(request)) {
        return new Promise<TrendingAsset[]>((resolve) => {
          resolveActiveFetch = resolve;
        });
      }
      return [];
    });
  });

  it('fetches only the active pill while it is loading', async () => {
    renderFeed({ activePillKey: 'trending' });

    await waitFor(() => {
      expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(1);
    });
    const request = mockedFetchCryptoPillTokens.mock.calls[0][0];
    expect(isGlobalTrendingRequest(request)).toBe(true);
    expect(request.includeTokenSecurityData).toBe(true);
  });

  it('prefetches the remaining pills once the active pill has loaded', async () => {
    renderFeed({ activePillKey: 'trending' });

    await waitFor(() => {
      expect(resolveActiveFetch).toBeDefined();
    });
    resolveActiveFetch?.([]);
    await waitFor(() => {
      expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(6);
    });

    const requestedPaths = mockedFetchCryptoPillTokens.mock.calls.map(
      (call) => call[0].path,
    );
    expect(requestedPaths).toContain('/v3/tokens/top-gainers');
    expect(requestedPaths).toContain('/v3/tokens/popular');
  });

  it('falls back to the popular request for a chain pill whose trending request is empty', async () => {
    renderFeed({ activePillKey: 'trending' });

    await waitFor(() => {
      expect(resolveActiveFetch).toBeDefined();
    });
    resolveActiveFetch?.([]);
    await waitFor(() => {
      expect(
        mockedFetchCryptoPillTokens.mock.calls.some(
          (call) =>
            call[0].path === '/v3/tokens/popular' &&
            call[0].chainIds.join(',') === 'eip155:4663',
        ),
      ).toBe(true);
    });
  });

  it('serves a prefetched pill from cache without refetching within the stale time', async () => {
    const { rerender, result } = renderFeed({ activePillKey: 'trending' });

    await waitFor(() => {
      expect(resolveActiveFetch).toBeDefined();
    });
    resolveActiveFetch?.([]);
    await waitFor(() => {
      expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(6);
    });

    rerender({ activePillKey: 'top_gainers' });

    await waitFor(() => {
      expect(result.current.results.top_gainers.data).toEqual([]);
    });
    expect(result.current.results.top_gainers.isLoading).toBe(false);
    expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(6);
  });

  it('filters out low-quality tokens from pill data', async () => {
    const clean = makeToken('AAA');
    const washTraded = makeToken('WASH', {
      securityData: {
        features: [{ featureId: 'WASH_TRADING' }],
      } as TrendingAsset['securityData'],
    });
    mockedFetchCryptoPillTokens.mockImplementation(async (request) => {
      if (isGlobalTrendingRequest(request)) {
        return [clean, washTraded];
      }
      return [];
    });

    const { result } = renderFeed({ activePillKey: 'trending' });

    await waitFor(() => {
      expect(result.current.results.trending.data).toEqual([clean]);
    });
  });

  it('maps watchlist tokens to trending assets, newest first', () => {
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: [makeWatchlistToken('OLD'), makeWatchlistToken('NEW')],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);

    const { result } = renderFeed({ activePillKey: 'watchlist' });

    expect(result.current.results.watchlist.data?.map((t) => t.symbol)).toEqual(
      ['NEW', 'OLD'],
    );
  });

  it('marks the watchlist result as loading while the watchlist query loads', () => {
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: jest.fn(),
    } as never);

    const { result } = renderFeed({ activePillKey: 'watchlist' });

    expect(result.current.results.watchlist.isLoading).toBe(true);
    expect(result.current.results.watchlist.data).toBeUndefined();
  });

  it('refetches the active pill and the watchlist on a refresh trigger', async () => {
    mockIsWatchlistEnabled = true;
    const refetchWatchlist = jest.fn().mockResolvedValue(undefined);
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: refetchWatchlist,
    } as never);

    const { rerender } = renderFeed({
      activePillKey: 'trending',
      refresh: { trigger: 0, silentRefresh: true },
    });

    await waitFor(() => {
      expect(resolveActiveFetch).toBeDefined();
    });
    resolveActiveFetch?.([]);
    await waitFor(() => {
      expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(6);
    });

    rerender({ refresh: { trigger: 1, silentRefresh: true } });

    await waitFor(() => {
      expect(refetchWatchlist).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(
        mockedFetchCryptoPillTokens.mock.calls.filter((call) =>
          isGlobalTrendingRequest(call[0]),
        ).length,
      ).toBe(2);
    });
    expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(7);
  });

  it('skips the watchlist refetch when the watchlist flag is off', async () => {
    const refetchWatchlist = jest.fn().mockResolvedValue(undefined);
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: refetchWatchlist,
    } as never);

    const { rerender } = renderFeed({
      activePillKey: 'trending',
      refresh: { trigger: 0, silentRefresh: true },
    });

    await waitFor(() => {
      expect(resolveActiveFetch).toBeDefined();
    });
    resolveActiveFetch?.([]);
    await waitFor(() => {
      expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(6);
    });

    rerender({ refresh: { trigger: 1, silentRefresh: true } });

    await waitFor(() => {
      expect(
        mockedFetchCryptoPillTokens.mock.calls.filter((call) =>
          isGlobalTrendingRequest(call[0]),
        ).length,
      ).toBe(2);
    });
    expect(refetchWatchlist).not.toHaveBeenCalled();
    expect(mockedFetchCryptoPillTokens).toHaveBeenCalledTimes(7);
  });
});
