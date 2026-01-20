import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';
import { NetworkToCaipChainId } from '../../../NetworkMultiSelector/NetworkMultiSelector.constants';

/**
 * Baseline thresholds for multi-chain requests
 * When users select multiple networks, use these conservative values to ensure quality across all chains
 */
export const MULTI_CHAIN_BASELINE_THRESHOLDS = {
  minLiquidity: 200000, // $200k
  minVolume24h: 1000000, // $1M
};

/**
 * Per-network minimum thresholds for trending tokens
 * Based on analysis of real Phantom trending data (Jan 2026) to filter out low-liquidity tokens and shitcoins
 */
export const TRENDING_NETWORK_THRESHOLDS: Record<
  string,
  {
    minLiquidity: number;
    minVolume24h: number;
  }
> = {
  // Tier 1: High-volume mature networks
  [NetworkToCaipChainId.ETHEREUM]: {
    minLiquidity: 100000, // $100k - Captures all major DeFi tokens
    minVolume24h: 500000, // $500k - Matches Phantom: includes Pepe, UNI, Render, Ondo
  },
  [NetworkToCaipChainId.SOLANA]: {
    minLiquidity: 500000, // $500k - Active memecoin ecosystem
    minVolume24h: 2000000, // $2M - Includes Bonk ($2.9M), filters pump-and-dumps
  },

  // Tier 2: Established L2s and major chains
  [NetworkToCaipChainId.BASE]: {
    minLiquidity: 250000, // $250k - Growing L2 ecosystem
    minVolume24h: 700000, // $700k - Captures Brett ($695K), KAITO ($738K), Ribbita ($700K)
  },
  [NetworkToCaipChainId.ARBITRUM]: {
    minLiquidity: 0, // No filter - Show all trending tokens
    minVolume24h: 0, // No filter - Maximize visibility for this network
  },
  [NetworkToCaipChainId.OPTIMISM]: {
    minLiquidity: 0, // No filter - Show all trending tokens
    minVolume24h: 0, // No filter - Maximize visibility for this network
  },
  [NetworkToCaipChainId.AVALANCHE]: {
    minLiquidity: 0, // No filter - Show all trending tokens
    minVolume24h: 0, // No filter - Maximize visibility for this network
  },
  [NetworkToCaipChainId.BNB]: {
    minLiquidity: 300000, // $300k - High activity network
    minVolume24h: 1000000, // $1M - Large trading volumes
  },
  [NetworkToCaipChainId.POLYGON]: {
    minLiquidity: 100000,
    minVolume24h: 300000,
  },

  // Tier 3: Growing networks
  [NetworkToCaipChainId.SEI]: {
    minLiquidity: 0, // No filter - Show all trending tokens
    minVolume24h: 0, // No filter - Maximize visibility for this network
  },

  // Tier 4: Emerging networks and L2s
  [NetworkToCaipChainId.LINEA]: {
    minLiquidity: 0, // No filter - Show all trending tokens
    minVolume24h: 0, // No filter - Maximize visibility for emerging network
  },
  [NetworkToCaipChainId.ZKSYNC_ERA]: {
    minLiquidity: 0, // No filter - Show all trending tokens
    minVolume24h: 0, // No filter - Maximize visibility for this network
  },

  'tron:728126428': {
    minLiquidity: 0,
    minVolume24h: 0,
  },
};

/**
 * Determines minimum liquidity threshold based on selected chains
 * - Single chain: Uses network-specific threshold
 * - Multiple chains: Uses multi-chain baseline threshold (conservative cross-chain filter)
 * - Unknown chain: Falls back to multi-chain baseline
 */
export const getMinLiquidityForChains = (chainIds: CaipChainId[]): number => {
  if (chainIds.length === 1) {
    return (
      TRENDING_NETWORK_THRESHOLDS[chainIds[0]]?.minLiquidity ??
      MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity
    );
  }
  return MULTI_CHAIN_BASELINE_THRESHOLDS.minLiquidity;
};

/**
 * Determines minimum 24h volume threshold based on selected chains
 * - Single chain: Uses network-specific threshold
 * - Multiple chains: Uses multi-chain baseline threshold (conservative cross-chain filter)
 * - Unknown chain: Falls back to multi-chain baseline
 */
export const getMinVolume24hForChains = (chainIds: CaipChainId[]): number => {
  if (chainIds.length === 1) {
    return (
      TRENDING_NETWORK_THRESHOLDS[chainIds[0]]?.minVolume24h ??
      MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h
    );
  }
  return MULTI_CHAIN_BASELINE_THRESHOLDS.minVolume24h;
};

/**
 * Polling interval in milliseconds (5 minutes)
 */
const POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Options for fetching trending tokens
 */
interface FetchOptions {
  /**
   * If true, the fetch will silently update results without setting loading state or error.
   * On success: updates results
   * On failure: does nothing (preserves existing results and error state)
   */
  isSilentUpdate?: boolean;
}

/**
 * Hook for handling trending tokens request
 * @returns {Object} An object containing the trending tokens results, loading state, error, and a function to trigger fetch
 */
export const useTrendingRequest = (options: {
  chainIds?: CaipChainId[];
  sortBy?: SortTrendingBy;
  minLiquidity?: number;
  minVolume24hUsd?: number;
  maxVolume24hUsd?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
}) => {
  const {
    chainIds: providedChainIds = [],
    sortBy = 'h24_trending',
    minLiquidity: providedMinLiquidity,
    minVolume24hUsd: providedMinVolume24hUsd,
    maxVolume24hUsd,
    minMarketCap = 0,
    maxMarketCap,
  } = options;

  // Use provided chainIds or default to trending networks
  const chainIds = useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }
    return TRENDING_NETWORKS_LIST.map((network) => network.caipChainId);
  }, [providedChainIds]);

  // Calculate thresholds based on selected chains
  const minLiquidity = useMemo(
    () => providedMinLiquidity ?? getMinLiquidityForChains(chainIds),
    [providedMinLiquidity, chainIds],
  );

  const minVolume24hUsd = useMemo(
    () => providedMinVolume24hUsd ?? getMinVolume24hForChains(chainIds),
    [providedMinVolume24hUsd, chainIds],
  );

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-fetching
  const stableChainIds = useStableArray(chainIds);

  const [results, setResults] = useState<
    Awaited<ReturnType<typeof getTrendingTokens>>
  >([]);

  const [isLoading, setIsLoading] = useState(true);

  const [error, setError] = useState<Error | null>(null);

  const fetchTrendingTokens = useCallback(
    async (fetchOptions: FetchOptions = {}) => {
      const { isSilentUpdate = false } = fetchOptions;

      if (!stableChainIds.length) {
        if (!isSilentUpdate) {
          setResults([]);
          setIsLoading(false);
        }
        return;
      }

      // Increment request ID to mark this as the current request
      const currentRequestId = ++requestIdRef.current;

      if (!isSilentUpdate) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const resultsToStore = await getTrendingTokens({
          chainIds: stableChainIds,
          sortBy,
          minLiquidity,
          minVolume24hUsd,
          maxVolume24hUsd,
          minMarketCap,
          maxMarketCap,
          excludeLabels: ['stable_coin', 'blue_chip'],
        });
        // Only update state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setResults(resultsToStore);
        }
      } catch (err) {
        // Only update state if this is still the current request and not a silent update
        if (currentRequestId === requestIdRef.current && !isSilentUpdate) {
          setError(err as Error);
          setResults([]);
        }
        // Silent updates silently fail - don't update error state or results
      } finally {
        // Only update loading state if this is still the current request
        if (currentRequestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      stableChainIds,
      sortBy,
      minLiquidity,
      minVolume24hUsd,
      maxVolume24hUsd,
      minMarketCap,
      maxMarketCap,
    ],
  );

  // Automatically trigger fetch when options change
  useEffect(() => {
    fetchTrendingTokens();
  }, [fetchTrendingTokens]);

  // Track if initial load has completed successfully
  const initialLoadCompleteRef = useRef(false);
  useEffect(() => {
    if (!isLoading && !initialLoadCompleteRef.current) {
      if (results.length > 0 || !error) {
        initialLoadCompleteRef.current = true;
      }
    }
  }, [isLoading, results.length, error]);

  // Refresh interval effect
  useEffect(() => {
    // Don't poll if we are loading, or initial fetch did not return data
    if (
      isLoading ||
      !initialLoadCompleteRef.current ||
      (!results.length && error)
    ) {
      return;
    }

    const pollingInterval = setInterval(() => {
      fetchTrendingTokens({ isSilentUpdate: true });
    }, POLLING_INTERVAL_MS);

    return () => {
      clearInterval(pollingInterval);
    };
  }, [isLoading, results.length, error, fetchTrendingTokens]);

  return {
    results,
    isLoading,
    error,
    fetch: fetchTrendingTokens,
  };
};
