import { useState, useEffect, useCallback, useRef } from 'react';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { PerpsMarketData } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';

/**
 * Result interface for usePerpsMarketForAsset hook
 */
export interface UsePerpsMarketForAssetResult {
  /** Whether a perps market exists for this asset */
  hasPerpsMarket: boolean;
  /** Market data if available (for navigation) */
  marketData: PerpsMarketData | null;
  /** Whether the hook is still loading */
  isLoading: boolean;
  /** Error message if market lookup failed */
  error: string | null;
}

// Module-level cache for market existence checks
// Persists across component mounts/unmounts for efficient re-use
const marketExistenceCache = new Map<
  string,
  { exists: boolean; data: PerpsMarketData | null; timestamp: number }
>();

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Clear expired entries from the cache
 */
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of marketExistenceCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      marketExistenceCache.delete(key);
    }
  }
};

/**
 * usePerpsMarketForAsset Hook
 *
 * Efficiently checks if a spot asset has a corresponding perps market.
 * Designed for use outside of perps screens (e.g., spot asset details).
 *
 * Key Features:
 * - Module-level caching to avoid repeated API calls
 * - Single lightweight API call: `getMarkets({ symbols: [symbol], readOnly: true })`
 * - Uses readOnly mode - works without full perps initialization (no wallet/WebSocket)
 * - Handles symbol normalization (ETH on any chain maps to ETH perp)
 *
 * @param symbol - Token symbol (e.g., 'ETH', 'BTC')
 * @returns Object with hasPerpsMarket, marketData, isLoading, error
 *
 * @example
 * ```tsx
 * const { hasPerpsMarket, marketData, isLoading } = usePerpsMarketForAsset('ETH');
 *
 * if (hasPerpsMarket && marketData) {
 *   navigateToMarketDetails(marketData, 'asset_detail_screen');
 * }
 * ```
 */
export const usePerpsMarketForAsset = (
  symbol: string | undefined | null,
): UsePerpsMarketForAssetResult => {
  const { getMarkets } = usePerpsTrading();

  // Track if component is still mounted
  const isMountedRef = useRef(true);

  // Normalize symbol for lookup
  const lookupSymbol = symbol?.toUpperCase() ?? null;

  const [state, setState] = useState<{
    hasPerpsMarket: boolean;
    marketData: PerpsMarketData | null;
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Initialize from cache if available
    if (!lookupSymbol) {
      return {
        hasPerpsMarket: false,
        marketData: null,
        isLoading: false,
        error: null,
      };
    }

    const cached = marketExistenceCache.get(lookupSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        hasPerpsMarket: cached.exists,
        marketData: cached.data,
        isLoading: false,
        error: null,
      };
    }

    return {
      hasPerpsMarket: false,
      marketData: null,
      isLoading: true,
      error: null,
    };
  });

  const checkMarketExists = useCallback(async () => {
    if (!lookupSymbol) {
      return;
    }

    // Check cache first
    const cached = marketExistenceCache.get(lookupSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (isMountedRef.current) {
        setState({
          hasPerpsMarket: cached.exists,
          marketData: cached.data,
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    try {
      // Single lightweight API call with readOnly mode
      // readOnly: true bypasses full initialization (no wallet/WebSocket needed)
      const markets = await getMarkets({
        symbols: [lookupSymbol],
        readOnly: true,
      });

      // Find exact match by symbol
      const matchedMarket = markets.find(
        (market) => market.name.toUpperCase() === lookupSymbol,
      );

      const exists = matchedMarket !== undefined;

      // Create PerpsMarketData if market exists
      let marketData: PerpsMarketData | null = null;
      if (matchedMarket) {
        marketData = {
          symbol: matchedMarket.name,
          name: matchedMarket.name,
          maxLeverage: `${matchedMarket.maxLeverage}x`,
          price: '',
          change24h: '',
          change24hPercent: '',
          volume: '',
        };
      }

      // Cache the result
      marketExistenceCache.set(lookupSymbol, {
        exists,
        data: marketData,
        timestamp: Date.now(),
      });

      // Periodic cache cleanup
      cleanExpiredCache();

      if (isMountedRef.current) {
        setState({
          hasPerpsMarket: exists,
          marketData,
          isLoading: false,
          error: null,
        });
      }
    } catch (err) {
      DevLogger.log(
        'usePerpsMarketForAsset: Error checking market existence:',
        err,
      );

      // On error, don't cache - allow retry
      if (isMountedRef.current) {
        setState({
          hasPerpsMarket: false,
          marketData: null,
          isLoading: false,
          error:
            err instanceof Error ? err.message : 'Failed to check perps market',
        });
      }
    }
  }, [lookupSymbol, getMarkets]);

  // Effect to check market existence
  useEffect(() => {
    isMountedRef.current = true;

    // Early bail for missing symbol
    if (!lookupSymbol) {
      setState({
        hasPerpsMarket: false,
        marketData: null,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Check if already cached
    const cached = marketExistenceCache.get(lookupSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setState({
        hasPerpsMarket: cached.exists,
        marketData: cached.data,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Need to fetch
    setState((prev) => ({ ...prev, isLoading: true }));
    checkMarketExists();

    return () => {
      isMountedRef.current = false;
    };
  }, [lookupSymbol, checkMarketExists]);

  return {
    hasPerpsMarket: state.hasPerpsMarket,
    marketData: state.marketData,
    isLoading: state.isLoading,
    error: state.error,
  };
};
