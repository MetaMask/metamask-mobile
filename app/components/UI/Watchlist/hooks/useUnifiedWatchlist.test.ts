import { act, renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from '../../Perps/hooks';
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
const mockRefetchTokenMembership = jest.fn().mockResolvedValue(undefined);
const mockRefetchTokens = jest.fn().mockResolvedValue(undefined);
const mockRefreshPerps = jest.fn().mockResolvedValue(undefined);

const mockPerpsMarkets = (
  overrides: Partial<ReturnType<typeof usePerpsMarkets>> = {},
): ReturnType<typeof usePerpsMarkets> => ({
  markets: [],
  isLoading: false,
  error: null,
  refresh: mockRefreshPerps,
  isRefreshing: false,
  hasResolvedInitialData: true,
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
      refetch: mockRefetchTokenMembership,
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
      appendOrderKey: jest.fn().mockResolvedValue(undefined),
    }));
  });

  it('surfaces metadata coverage error while token metadata is partially hydrated', () => {
    const hydratedAssetId = 'eip155:1/erc20:0xhydrated';
    const missingAssetId = 'eip155:1/erc20:0xmissing';
    mockedUseTokenWatchlistMembershipQuery.mockReturnValue({
      data: { assets: [hydratedAssetId, missingAssetId], version: 1 },
      isLoading: false,
      error: null,
      refetch: mockRefetchTokenMembership,
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
    expect(result.current.tokens.error).toBe(
      'Some watchlist metadata is unavailable',
    );
  });

  it('keeps Perps items empty while Perps initial snapshot is pending but exposes membership symbols', () => {
    mockedUsePerpsMarkets.mockReturnValue(
      mockPerpsMarkets({ isLoading: true, hasResolvedInitialData: false }),
    );

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.perps.items).toEqual([]);
    expect(result.current.perpsMembershipSymbols).toEqual(['BTC']);
    expect(result.current.isInitialLoading).toBe(true);
  });

  it('exposes persisted ordered items from the presentation-order hook', () => {
    mockedUseWatchlistOrder.mockImplementation((items) => ({
      orderedItems: [...items].reverse(),
      isLoading: false,
      isReady: true,
      error: null,
      retry: jest.fn().mockResolvedValue(undefined),
      persistOrder: jest.fn().mockResolvedValue(undefined),
      appendOrderKey: jest.fn().mockResolvedValue(undefined),
    }));

    const { result } = renderHook(() => useUnifiedWatchlist());

    expect(result.current.items.map((item) => item.key)).toEqual(['perp:btc']);
  });

  it('disables presentation-order ownership in token-only mode', () => {
    mockedUseSelector
      .mockReset()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(['BTC']);

    renderHook(() => useUnifiedWatchlist());

    expect(mockedUseWatchlistOrder).toHaveBeenLastCalledWith(
      expect.any(Array),
      { enabled: false },
    );
  });

  it('retries a visible order error through the shared refresh', async () => {
    const retryOrder = jest.fn().mockResolvedValue(undefined);
    mockedUseWatchlistOrder.mockImplementation((items) => ({
      orderedItems: [...items],
      isLoading: false,
      isReady: false,
      error: 'Order storage unavailable',
      retry: retryOrder,
      persistOrder: jest.fn().mockResolvedValue(undefined),
      appendOrderKey: jest.fn().mockResolvedValue(undefined),
    }));

    const { result } = renderHook(() => useUnifiedWatchlist());
    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.orderError).toBe('Order storage unavailable');
    expect(retryOrder).toHaveBeenCalledTimes(1);
  });
});
