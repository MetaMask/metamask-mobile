import {
  useTrendingRequest,
  getMinLiquidityForChains,
  getMinVolume24hForChains,
  MULTI_CHAIN_BASELINE_THRESHOLDS,
} from './useTrendingRequest';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { act, waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import/no-namespace
import * as assetsControllers from '@metamask/assets-controllers';
import { CaipChainId } from '@metamask/utils';
import { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { ImageSourcePropType } from 'react-native';
import { NetworkToCaipChainId } from '../../../NetworkMultiSelector/NetworkMultiSelector.constants';

// Mock the TRENDING_NETWORKS_LIST constant
jest.mock('../../utils/trendingNetworksList', () => {
  const mockNetworks: ProcessedNetwork[] = [
    {
      id: 'eip155:1',
      name: 'Ethereum Mainnet',
      caipChainId: 'eip155:1' as CaipChainId,
      imageSource: {
        uri: 'https://example.com/ethereum.png',
      } as ImageSourcePropType,
      isSelected: false,
    },
    {
      id: 'eip155:137',
      name: 'Polygon',
      caipChainId: 'eip155:137' as CaipChainId,
      imageSource: {
        uri: 'https://example.com/polygon.png',
      } as ImageSourcePropType,
      isSelected: false,
    },
  ];

  return {
    TRENDING_NETWORKS_LIST: mockNetworks,
  };
});

describe('useTrendingRequest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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

  describe('polling', () => {
    beforeEach(() => {
      jest.clearAllTimers();
    });

    it('polls at 5 minute intervals, silently updates results, and cleans up on unmount', async () => {
      const spyGetTrendingTokens = jest.spyOn(
        assetsControllers,
        'getTrendingTokens',
      );
      const initialResults: assetsControllers.TrendingAsset[] = [
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
      const updatedResults: assetsControllers.TrendingAsset[] = [
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

      spyGetTrendingTokens
        .mockResolvedValueOnce(initialResults as never)
        .mockResolvedValueOnce(updatedResults as never)
        .mockResolvedValue(updatedResults as never);

      const { result, unmount } = renderHookWithProvider(() =>
        useTrendingRequest({
          chainIds: ['eip155:1'],
        }),
      );

      // Initial load completes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.results).toEqual(initialResults);
      });
      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);

      // First poll after 5 minutes - silently updates results
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(2);
      expect(result.current.results).toEqual(updatedResults);
      expect(result.current.isLoading).toBe(false);

      // Second poll after another 5 minutes
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(3);

      // Unmount cleans up polling interval
      unmount();

      await act(async () => {
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      // No additional calls after unmount
      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(3);

      spyGetTrendingTokens.mockRestore();
    });

    it('does not start polling when initial load fails', async () => {
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
        expect(result.current.results).toEqual([]);
        expect(result.current.isLoading).toBe(false);
      });

      // Fast-forward 5 minutes - polling does not start
      await act(async () => {
        await jest.advanceTimersByTimeAsync(5 * 60 * 1000);
      });

      expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);

      spyGetTrendingTokens.mockRestore();
      unmount();
    });
  });

  describe('getMinLiquidityForChains', () => {
    it('returns multi-chain baseline threshold for multiple chains', () => {
      const chainIds: CaipChainId[] = [
        NetworkToCaipChainId.ETHEREUM,
        NetworkToCaipChainId.SEI,
        NetworkToCaipChainId.ARBITRUM,
      ];

      const result = getMinLiquidityForChains(chainIds);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity); // $200k baseline
    });

    it('returns specific threshold for single chain - SEI', () => {
      const chainIds: CaipChainId[] = [NetworkToCaipChainId.SEI];

      const result = getMinLiquidityForChains(chainIds);

      expect(result).toBe(0); // SEI: No filter - Show all trending tokens
    });

    it('returns specific threshold for single chain - Solana', () => {
      const chainIds: CaipChainId[] = [NetworkToCaipChainId.SOLANA];

      const result = getMinLiquidityForChains(chainIds);

      expect(result).toBe(500000); // Solana: $500k (high DEX volume)
    });

    it('returns specific threshold for single chain - Base', () => {
      const chainIds: CaipChainId[] = [NetworkToCaipChainId.BASE];

      const result = getMinLiquidityForChains(chainIds);

      expect(result).toBe(250000); // Base: $250k (growing L2)
    });

    it('returns multi-chain baseline for empty chain array', () => {
      const result = getMinLiquidityForChains([]);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity); // $200k baseline
    });

    it('returns multi-chain baseline for single unknown chain', () => {
      const unknownChainIds: CaipChainId[] = ['eip155:9999' as CaipChainId];

      const result = getMinLiquidityForChains(unknownChainIds);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity); // Fallback to baseline
    });

    it('returns multi-chain baseline for multiple unknown chains', () => {
      const unknownChainIds: CaipChainId[] = [
        'eip155:9999' as CaipChainId,
        'eip155:8888' as CaipChainId,
      ];

      const result = getMinLiquidityForChains(unknownChainIds);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity); // Fallback to baseline
    });
  });

  describe('getMinVolume24hForChains', () => {
    it('returns multi-chain baseline threshold for multiple chains', () => {
      const chainIds: CaipChainId[] = [
        NetworkToCaipChainId.ETHEREUM,
        NetworkToCaipChainId.SEI,
        NetworkToCaipChainId.ARBITRUM,
      ];

      const result = getMinVolume24hForChains(chainIds);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h); // $1M baseline
    });

    it('returns specific threshold for single chain - BASE', () => {
      const chainIds: CaipChainId[] = [NetworkToCaipChainId.BASE];

      const result = getMinVolume24hForChains(chainIds);

      expect(result).toBe(700000); // Base: $700k (growing L2)
    });

    it('returns specific threshold for single chain - Solana', () => {
      const chainIds: CaipChainId[] = [NetworkToCaipChainId.SOLANA];

      const result = getMinVolume24hForChains(chainIds);

      expect(result).toBe(2000000); // Solana: $2M (high volume)
    });

    it('returns specific threshold for single chain - Arbitrum', () => {
      const chainIds: CaipChainId[] = [NetworkToCaipChainId.ARBITRUM];

      const result = getMinVolume24hForChains(chainIds);

      expect(result).toBe(0); // Arbitrum: No filter - Show all trending tokens
    });

    it('returns multi-chain baseline for empty chain array', () => {
      const result = getMinVolume24hForChains([]);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h); // $1M baseline
    });

    it('returns multi-chain baseline for single unknown chain', () => {
      const unknownChainIds: CaipChainId[] = ['eip155:9999' as CaipChainId];

      const result = getMinVolume24hForChains(unknownChainIds);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h); // Fallback to baseline
    });

    it('returns multi-chain baseline for multiple unknown chains', () => {
      const unknownChainIds: CaipChainId[] = [
        'eip155:9999' as CaipChainId,
        'eip155:8888' as CaipChainId,
      ];

      const result = getMinVolume24hForChains(unknownChainIds);

      expect(result).toBe(MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h); // Fallback to baseline
    });
  });

  describe('per-network threshold integration', () => {
    it('uses per-network liquidity threshold when single chainId provided - Ethereum', async () => {
      const spyGetTrendingTokens = jest.spyOn(
        assetsControllers,
        'getTrendingTokens',
      );
      spyGetTrendingTokens.mockResolvedValue([] as never);

      renderHookWithProvider(() =>
        useTrendingRequest({
          chainIds: [NetworkToCaipChainId.ETHEREUM],
        }),
      );

      await waitFor(() => {
        expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
      });

      expect(spyGetTrendingTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          minLiquidity: 100000, // Ethereum: $100k - Matches Phantom
          minVolume24hUsd: 500000, // Ethereum: $500k - Matches Phantom
        }),
      );

      spyGetTrendingTokens.mockRestore();
    });

    it('uses per-network volume threshold when single chainId provided - SEI', async () => {
      const spyGetTrendingTokens = jest.spyOn(
        assetsControllers,
        'getTrendingTokens',
      );
      spyGetTrendingTokens.mockResolvedValue([] as never);

      renderHookWithProvider(() =>
        useTrendingRequest({
          chainIds: [NetworkToCaipChainId.SEI],
        }),
      );

      await waitFor(() => {
        expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
      });

      expect(spyGetTrendingTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          minLiquidity: 0, // SEI: No filter - Show all trending tokens
          minVolume24hUsd: 0, // SEI: No filter
        }),
      );

      spyGetTrendingTokens.mockRestore();
    });

    it('uses multi-chain baseline when multiple chains provided', async () => {
      const spyGetTrendingTokens = jest.spyOn(
        assetsControllers,
        'getTrendingTokens',
      );
      spyGetTrendingTokens.mockResolvedValue([] as never);

      const chainIds: CaipChainId[] = [
        NetworkToCaipChainId.ETHEREUM,
        NetworkToCaipChainId.SEI,
        NetworkToCaipChainId.BASE,
      ];

      renderHookWithProvider(() =>
        useTrendingRequest({
          chainIds,
        }),
      );

      await waitFor(() => {
        expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
      });

      expect(spyGetTrendingTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          minLiquidity: MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity, // $200k baseline
          minVolume24hUsd: MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h, // $1M baseline
        }),
      );

      spyGetTrendingTokens.mockRestore();
    });

    it('allows overriding per-network thresholds with provided values', async () => {
      const spyGetTrendingTokens = jest.spyOn(
        assetsControllers,
        'getTrendingTokens',
      );
      spyGetTrendingTokens.mockResolvedValue([] as never);

      const customMinLiquidity = 999999;
      const customMinVolume = 888888;

      renderHookWithProvider(() =>
        useTrendingRequest({
          chainIds: [NetworkToCaipChainId.ETHEREUM],
          minLiquidity: customMinLiquidity,
          minVolume24hUsd: customMinVolume,
        }),
      );

      await waitFor(() => {
        expect(spyGetTrendingTokens).toHaveBeenCalledTimes(1);
      });

      expect(spyGetTrendingTokens).toHaveBeenCalledWith(
        expect.objectContaining({
          minLiquidity: customMinLiquidity,
          minVolume24hUsd: customMinVolume,
        }),
      );

      spyGetTrendingTokens.mockRestore();
    });
  });
});
