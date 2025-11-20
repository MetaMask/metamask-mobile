import { DEBOUNCE_WAIT, useTrendingRequest, clearCache } from '.';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';
import {
  ProcessedNetwork,
  useNetworksByNamespace,
} from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworksToUse } from '../../../../hooks/useNetworksToUse/useNetworksToUse';

// Mock the network hooks
jest.mock(
  '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace',
  () => ({
    useNetworksByNamespace: jest.fn(),
    NetworkType: {
      Popular: 'popular',
      Custom: 'custom',
    },
  }),
);

jest.mock('../../../../hooks/useNetworksToUse/useNetworksToUse', () => ({
  useNetworksToUse: jest.fn(),
}));

const mockUseNetworksByNamespace =
  useNetworksByNamespace as jest.MockedFunction<typeof useNetworksByNamespace>;
const mockUseNetworksToUse = useNetworksToUse as jest.MockedFunction<
  typeof useNetworksToUse
>;

// Default mock networks
const mockDefaultNetworks: ProcessedNetwork[] = [
  {
    id: '1',
    name: 'Ethereum Mainnet',
    caipChainId: 'eip155:1' as const,
    isSelected: true,
    imageSource: { uri: 'ethereum' },
  },
  {
    id: '137',
    name: 'Polygon',
    caipChainId: 'eip155:137' as const,
    isSelected: true,
    imageSource: { uri: 'polygon' },
  },
];

describe('useTrendingRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Clear cache between tests to ensure test isolation
    clearCache();
    // Set up default mocks for network hooks
    mockUseNetworksByNamespace.mockReturnValue({
      networks: mockDefaultNetworks,
      selectedNetworks: mockDefaultNetworks,
      areAllNetworksSelected: true,
      areAnyNetworksSelected: true,
      networkCount: mockDefaultNetworks.length,
      selectedCount: mockDefaultNetworks.length,
    });
    mockUseNetworksToUse.mockReturnValue({
      networksToUse: mockDefaultNetworks,
      evmNetworks: mockDefaultNetworks,
      solanaNetworks: [],
      selectedEvmAccount: null,
      selectedSolanaAccount: null,
      isMultichainAccountsState2Enabled: false,
      areAllNetworksSelectedCombined: true,
      areAllEvmNetworksSelected: true,
      areAllSolanaNetworksSelected: false,
    } as unknown as ReturnType<typeof useNetworksToUse>);
  });

  afterEach(() => {
    jest.useRealTimers();
    clearCache();
  });

  it('returns an object with results, isLoading, error, and fetch function', () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    spyGetTrendingTokens.mockResolvedValue([]);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    expect(result.current).toHaveProperty('results');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('fetch');
    expect(typeof result.current.fetch).toBe('function');
    expect(Array.isArray(result.current.results)).toBe(true);
    expect(typeof result.current.isLoading).toBe('boolean');

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('returns trending tokens results when fetch succeeds', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockResults: assetsControllers.TrendingAsset[] = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'TOKEN1',
        name: 'Token 1',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 1,
      },
      {
        assetId: 'eip155:1/erc20:0x456',
        symbol: 'TOKEN2',
        name: 'Token 2',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 1,
      },
    ];
    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('sets isLoading to true during fetch', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    let resolvePromise: ((value: unknown[]) => void) | undefined;
    const pendingPromise = new Promise<unknown[]>((resolve) => {
      resolvePromise = resolve;
    });
    spyGetTrendingTokens.mockReturnValue(pendingPromise as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      if (resolvePromise) {
        resolvePromise([]);
      }
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('sets error state when fetch fails', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockError = new Error('Failed to fetch trending tokens');
    spyGetTrendingTokens.mockRejectedValue(mockError);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.results).toEqual([]);
    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('allows manual retry after error using fetch function', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockError = new Error('Failed to fetch trending tokens');
    const mockResults: assetsControllers.TrendingAsset[] = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'TOKEN1',
        name: 'Token 1',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 1,
      },
    ];

    spyGetTrendingTokens.mockRejectedValueOnce(mockError);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.error).toEqual(mockError);

    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    await act(async () => {
      result.current.fetch();
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('uses default popular networks when chainIds is empty', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockResults: assetsControllers.TrendingAsset[] = [
      {
        assetId: 'eip155:1/erc20:0x123',
        symbol: 'TOKEN1',
        name: 'Token 1',
        decimals: 18,
        price: '1',
        aggregatedUsdVolume: 1,
        marketCap: 1,
      },
    ];
    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: [],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(mockUseNetworksByNamespace).toHaveBeenCalledWith({
      networkType: 'popular',
    });
    expect(mockUseNetworksToUse).toHaveBeenCalledWith({
      networks: mockDefaultNetworks,
      networkType: 'popular',
    });
    expect(spyGetTrendingTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        chainIds: ['eip155:1', 'eip155:137'],
      }),
    );
    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it('uses default popular networks when chainIds is not provided', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockResults: assetsControllers.TrendingAsset[] = [];
    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    renderHookWithProvider(() => useTrendingRequest({}));

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(mockUseNetworksByNamespace).toHaveBeenCalledWith({
      networkType: 'popular',
    });
    expect(spyGetTrendingTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        chainIds: ['eip155:1', 'eip155:137'],
      }),
    );

    spyGetTrendingTokens.mockRestore();
  });

  it('uses provided chainIds when available instead of default networks', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockResults: assetsControllers.TrendingAsset[] = [];
    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    const customChainIds: `${string}:${string}`[] = [
      'eip155:56',
      'eip155:42161',
    ];
    renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: customChainIds,
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    expect(spyGetTrendingTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        chainIds: customChainIds,
      }),
    );

    spyGetTrendingTokens.mockRestore();
  });

  it('coalesces multiple rapid calls into a single fetch', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    spyGetTrendingTokens.mockResolvedValue([]);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await act(async () => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
      await Promise.resolve();
    });

    // Clear cache so subsequent fetch calls will actually trigger API calls
    clearCache();
    spyGetTrendingTokens.mockClear();

    await act(async () => {
      result.current.fetch();
      result.current.fetch();
      result.current.fetch();

      jest.advanceTimersByTime(DEBOUNCE_WAIT - 100);
      expect(spyGetTrendingTokens).not.toHaveBeenCalled();

      jest.advanceTimersByTime(DEBOUNCE_WAIT + 200);
      await Promise.resolve();
    });

    expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });
});
