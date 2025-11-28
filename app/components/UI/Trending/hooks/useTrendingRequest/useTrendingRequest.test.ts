import { useTrendingRequest } from './useTrendingRequest';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';
import type { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { usePopularNetworks } from '../usePopularNetworks/usePopularNetworks';
import { CaipChainId } from '@metamask/utils';

jest.mock('../usePopularNetworks/usePopularNetworks');

const mockUsePopularNetworks = usePopularNetworks as jest.MockedFunction<
  typeof usePopularNetworks
>;

// Default mock networks
const mockDefaultNetworks: ProcessedNetwork[] = [
  {
    id: '1',
    name: 'Ethereum Mainnet',
    caipChainId: 'eip155:1' as CaipChainId,
    isSelected: true,
    imageSource: { uri: 'ethereum' },
  },
  {
    id: '137',
    name: 'Polygon',
    caipChainId: 'eip155:137' as CaipChainId,
    isSelected: true,
    imageSource: { uri: 'polygon' },
  },
];

describe('useTrendingRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePopularNetworks.mockReturnValue(mockDefaultNetworks);
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

    await waitFor(() => {
      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
    });

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

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      if (resolvePromise) {
        resolvePromise([]);
      }
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

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

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });

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

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError);
    });

    spyGetTrendingTokens.mockResolvedValue(mockResults as never);

    await act(async () => {
      await result.current.fetch();
    });

    await waitFor(() => {
      expect(result.current.error).toBe(null);
    });

    expect(result.current.results).toEqual(mockResults);
    expect(result.current.isLoading).toBe(false);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });

  it.each([
    { description: 'empty array', options: { chainIds: [] } },
    { description: 'not provided', options: {} },
  ])(
    'uses default popular networks when chainIds is $description',
    async ({ options }) => {
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

      const { result } = renderHookWithProvider(() =>
        useTrendingRequest(options),
      );

      await waitFor(() => {
        expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
      });

      expect(mockUsePopularNetworks).toHaveBeenCalled();
      expect(spyGetTrendingTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          chainIds: ['eip155:1', 'eip155:137'],
        }),
      );
      expect(result.current.results).toEqual(mockResults);
      expect(result.current.isLoading).toBe(false);

      spyGetTrendingTokens.mockRestore();
    },
  );

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

    await waitFor(() => {
      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
    });

    expect(spyGetTrendingTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        chainIds: customChainIds,
      }),
    );

    spyGetTrendingTokens.mockRestore();
  });

  it('handles stale results when multiple requests are triggered', async () => {
    const spyGetTrendingTokens = jest.spyOn(
      assetsControllers,
      'getTrendingTokens',
    );
    const mockResults1: assetsControllers.TrendingAsset[] = [
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
    const mockResults2: assetsControllers.TrendingAsset[] = [
      {
        assetId: 'eip155:1/erc20:0x456',
        symbol: 'TOKEN2',
        name: 'Token 2',
        decimals: 18,
        price: '2',
        aggregatedUsdVolume: 2,
        marketCap: 2,
      },
    ];

    let resolveFirstRequest: ((value: unknown[]) => void) | undefined;
    const firstRequestPromise = new Promise<unknown[]>((resolve) => {
      resolveFirstRequest = resolve;
    });

    spyGetTrendingTokens
      .mockReturnValueOnce(firstRequestPromise as never)
      .mockResolvedValueOnce(mockResults2 as never);

    const { result, unmount } = renderHookWithProvider(() =>
      useTrendingRequest({
        chainIds: ['eip155:1'],
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    await act(async () => {
      await result.current.fetch();
    });

    await waitFor(() => {
      expect(result.current.results).toEqual(mockResults2);
    });

    await act(async () => {
      if (resolveFirstRequest) {
        resolveFirstRequest(mockResults1);
      }
    });

    expect(result.current.results).toEqual(mockResults2);

    spyGetTrendingTokens.mockRestore();
    unmount();
  });
});
