import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from '../../Perps/hooks';
import type { PerpsMarketDataWithVolumeNumber } from '../../Perps/hooks/usePerpsMarkets';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useTokenWatchlistQuery } from '../../Assets/watchlist/hooks/useTokenWatchlistQuery';
import { useTokenWatchlistMembershipQuery } from '../../Assets/watchlist/hooks/useTokenWatchlist';
import { useUnifiedWatchlist } from './useUnifiedWatchlist';
import { useWatchlistOrder } from './useWatchlistOrder';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../Perps/selectors/featureFlags', () => ({
  selectPerpsEnabledFlag: jest.fn(),
}));

jest.mock('../../Perps/hooks', () => ({
  usePerpsMarkets: jest.fn(),
}));

jest.mock('../../Perps/selectors/perpsController', () => ({
  selectPerpsWatchlistMarkets: jest.fn(),
}));

jest.mock('../../Assets/selectors/featureFlags', () => ({
  selectTokenWatchlistEnabled: jest.fn(),
  selectUnifiedWatchlistEnabled: jest.fn(),
}));

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: jest.fn(),
}));

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: jest.fn(),
}));

jest.mock('../../Assets/watchlist/hooks/useTokenWatchlistQuery', () => ({
  useTokenWatchlistQuery: jest.fn(),
}));

jest.mock('../../Assets/watchlist/hooks/useTokenWatchlist', () => ({
  useTokenWatchlistMembershipQuery: jest.fn(),
}));

jest.mock('./useWatchlistOrder', () => ({
  useWatchlistOrder: jest.fn(),
}));

const mockedUseSelector = jest.mocked(useSelector);
const mockedUsePerpsMarkets = jest.mocked(usePerpsMarkets);
const mockedUseNetworkTier = jest.mocked(useNetworkTier);
const mockedGetHardwareTier = jest.mocked(getHardwareTier);
const mockedUseTokenWatchlistQuery = jest.mocked(useTokenWatchlistQuery);
const mockedUseTokenWatchlistMembershipQuery = jest.mocked(
  useTokenWatchlistMembershipQuery,
);
const mockedUseWatchlistOrder = jest.mocked(useWatchlistOrder);
const mockRefetchTokens = jest.fn();
const makeMarket = (symbol: string): PerpsMarketDataWithVolumeNumber => ({
  symbol,
  name: symbol,
  maxLeverage: '50x',
  price: '$100.00',
  change24h: '+$1.00',
  change24hPercent: '+1.00%',
  volume: '$1M',
  openInterest: '$2M',
  volumeNumber: 1,
});

const mockPerpsMarkets = (
  overrides: Partial<ReturnType<typeof usePerpsMarkets>> = {},
) => ({
  markets: [],
  isLoading: false,
  error: null,
  hasResolvedInitialData: true,
  refresh: jest.fn().mockResolvedValue(undefined),
  isRefreshing: false,
  ...overrides,
});

describe('useUnifiedWatchlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseSelector
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(['BTC']);
    mockedUseNetworkTier.mockReturnValue('WIFI');
    mockedGetHardwareTier.mockReturnValue('HIGH');
    mockedUseTokenWatchlistMembershipQuery.mockReturnValue({
      data: { assets: [], version: 1 },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTokenWatchlistMembershipQuery>);
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: mockRefetchTokens,
    } as unknown as ReturnType<typeof useTokenWatchlistQuery>);
    mockedUsePerpsMarkets.mockReturnValue(mockPerpsMarkets());
    mockedUseWatchlistOrder.mockImplementation((items) => ({
      orderedItems: [...items],
      isLoading: false,
      isReady: true,
      error: null,
      retry: jest.fn().mockResolvedValue(undefined),
      persistOrder: jest.fn().mockResolvedValue(undefined),
    }));
  });

  it('keeps reorder unready when authoritative membership is only partially hydrated', () => {
    const hydratedAssetId = 'eip155:1/erc20:0xhydrated';
    const missingAssetId = 'eip155:1/erc20:0xmissing';
    mockedUseTokenWatchlistMembershipQuery.mockReturnValue({
      data: {
        assets: [hydratedAssetId, missingAssetId],
        version: 1,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTokenWatchlistMembershipQuery>);
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: [
        {
          assetId: hydratedAssetId,
          symbol: 'HYD',
          name: 'Hydrated',
          decimals: 18,
          balance: '0',
          isInWallet: false,
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetchTokens,
    } as unknown as ReturnType<typeof useTokenWatchlistQuery>);

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.tokenMembershipAssetIds).toEqual([
      hydratedAssetId,
      missingAssetId,
    ]);
    expect(result.current.isTokenMetadataComplete).toBe(false);
    expect(result.current.tokens.error).toBe(
      'Some watchlist metadata is unavailable',
    );
    expect(mockedUseWatchlistOrder).toHaveBeenLastCalledWith(
      expect.any(Array),
      {
        enabled: true,
        isReady: false,
      },
    );
  });

  it('preserves watched Perps as unavailable before market data resolves', () => {
    mockedUsePerpsMarkets.mockReturnValue(
      mockPerpsMarkets({
        isLoading: true,
        hasResolvedInitialData: false,
      }),
    );

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.perps.items).toEqual([
      {
        kind: 'perp',
        key: 'perp:btc',
        symbol: 'BTC',
        status: 'unavailable',
      },
    ]);
  });

  it('exposes non-watchlisted markets as suggested Perps', () => {
    const watchedMarket = makeMarket('BTC');
    const suggestedMarket = makeMarket('ETH');
    mockedUsePerpsMarkets.mockReturnValue(
      mockPerpsMarkets({
        markets: [watchedMarket, suggestedMarket],
      }),
    );

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.suggestedPerps).toEqual([suggestedMarket]);
  });

  it('does not expose stale Perps symbols when Perps is disabled', () => {
    mockedUseSelector
      .mockReset()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(['BTC']);

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.isPerpsEnabled).toBe(false);
    expect(result.current.perps.items).toEqual([]);
  });

  it('masks cached token membership and metadata when the feature flag is off', () => {
    mockedUseSelector
      .mockReset()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(['BTC']);
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: [
        {
          assetId: 'eip155:1/slip44:60',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
          balance: '0',
          isInWallet: false,
        },
      ],
      isLoading: false,
      error: null,
      refetch: mockRefetchTokens,
    } as unknown as ReturnType<typeof useTokenWatchlistQuery>);

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.tokens).toEqual({
      items: [],
      isLoading: false,
      error: null,
    });
    expect(result.current.tokenMembershipAssetIds).toEqual([]);
    expect(result.current.tokenCount).toBe(0);
    expect(result.current.isPerpsEnabled).toBe(false);
  });

  it('reports unavailable token metadata instead of an empty watchlist offline', () => {
    mockedUseSelector
      .mockReset()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce([]);
    mockedUseNetworkTier.mockReturnValue('NONE');
    mockedUseTokenWatchlistQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useTokenWatchlistQuery>);

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.tokens.items).toEqual([]);
    expect(result.current.tokens.error).toBe(
      'Watchlist metadata is unavailable offline',
    );
  });

  it('preserves watched Perps as unavailable offline', () => {
    mockedUseNetworkTier.mockReturnValue('NONE');

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.perps.items).toEqual([
      {
        kind: 'perp',
        key: 'perp:btc',
        symbol: 'BTC',
        status: 'unavailable',
      },
    ]);
    expect(result.current.canRefresh).toBe(false);
  });

  it('keeps required hydration enabled but disables suggestions on low-end slow cellular', () => {
    mockedGetHardwareTier.mockReturnValue('LOW');
    mockedUseNetworkTier.mockReturnValue('SLOW_CELLULAR');

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(mockedUseTokenWatchlistQuery).toHaveBeenCalledWith({
      skipRemoteFetch: false,
    });
    expect(mockedUsePerpsMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ skipInitialFetch: false }),
    );
    expect(result.current.canFetchSuggestions).toBe(false);
    expect(result.current.canUseLivePerpsPrices).toBe(false);
  });

  it('does not issue a remote refresh while offline', async () => {
    mockedUseNetworkTier.mockReturnValue('NONE');

    const { result } = renderHook(() => useUnifiedWatchlist());

    await result.current.refresh();

    expect(mockRefetchTokens).not.toHaveBeenCalled();
  });

  it('retries failed local order reads while remote refresh is offline', async () => {
    const retryOrder = jest.fn().mockResolvedValue(undefined);
    mockedUseNetworkTier.mockReturnValue('NONE');
    mockedUseWatchlistOrder.mockImplementation((items) => ({
      orderedItems: [...items],
      isLoading: false,
      isReady: false,
      error: 'Order storage unavailable',
      retry: retryOrder,
      persistOrder: jest.fn().mockResolvedValue(undefined),
    }));

    const { result } = renderHook(() => useUnifiedWatchlist());
    await result.current.refresh();

    expect(result.current.orderError).toBe('Order storage unavailable');
    expect(result.current.canRefresh).toBe(true);
    expect(retryOrder).toHaveBeenCalledTimes(1);
    expect(mockRefetchTokens).not.toHaveBeenCalled();
  });
});
