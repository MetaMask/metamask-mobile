import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/perps-controller';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { PerpsCacheInvalidator } from '../../../../../UI/Perps/services/PerpsCacheInvalidator';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps';

/**
 * Result interface for usePerpsPositionsReadOnly hook
 */
export interface UsePerpsPositionsStandaloneResult {
  /** Array of open positions */
  positions: Position[];
  /** Whether the hook is still loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Refresh function to manually refetch data */
  refresh: () => Promise<void>;
}

// Module-level cache for positions
interface CacheEntry {
  positions: Position[];
  timestamp: number;
}

const positionsCache = new Map<string, CacheEntry>();

// Cache TTL: 30 seconds (same as usePerpsPositionForAsset)
const CACHE_TTL_MS = 30 * 1000;

/**
 * Clear expired entries from the cache
 */
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of positionsCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      positionsCache.delete(key);
    }
  }
};

/**
 * Clear all cache entries - exported for testing purposes only
 * @internal
 */
export const _clearPositionsCache = (): void => {
  positionsCache.clear();
};

/**
 * usePerpsPositionsStandalone Hook
 *
 * Fetches open perps positions for the current user using lightweight standalone mode.
 * Designed for use on the homepage where full perps initialization is not desired.
 *
 * Key Features:
 * - Module-level caching (30s TTL) to avoid repeated API calls
 * - Uses standalone mode - works without full perps initialization (no wallet/WebSocket)
 * - HIP-3 multi-DEX aggregation supported (positions across all DEXes)
 * - Subscribes to PerpsCacheInvalidator for automatic refresh after trades
 * - Returns empty array if user has no positions
 *
 * Limitations (from standalone mode):
 * - No real-time updates (HTTP only, no WebSocket)
 *
 * @returns Object with positions, isLoading, error, refresh
 */
export const usePerpsPositionsStandalone =
  (): UsePerpsPositionsStandaloneResult => {
    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const userAddress = useSelector(
      selectSelectedInternalAccountFormattedAddress,
    );

    const isMountedRef = useRef(true);
    const requestIdRef = useRef(0);

    // Cache key includes user address
    const cacheKey = userAddress ? `positions_${userAddress}` : null;

    const [state, setState] = useState<{
      positions: Position[];
      isLoading: boolean;
      error: string | null;
    }>(() => {
      if (!cacheKey || !isPerpsEnabled) {
        return { positions: [], isLoading: false, error: null };
      }

      const cached = positionsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return { positions: cached.positions, isLoading: false, error: null };
      }

      return { positions: [], isLoading: true, error: null };
    });

    const fetchPositions = useCallback(async () => {
      if (!isPerpsEnabled || !cacheKey || !userAddress) {
        setState({ positions: [], isLoading: false, error: null });
        return;
      }

      const currentRequestId = ++requestIdRef.current;

      // Check cache first
      const cached = positionsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        if (isMountedRef.current) {
          setState({
            positions: cached.positions,
            isLoading: false,
            error: null,
          });
        }
        return;
      }

      try {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        const controller = Engine.context?.PerpsController;
        if (!controller || typeof controller.getPositions !== 'function') {
          setState({ positions: [], isLoading: false, error: null });
          return;
        }

        const positions = await controller.getPositions({
          standalone: true,
          userAddress,
        });

        if (
          requestIdRef.current !== currentRequestId ||
          !isMountedRef.current
        ) {
          return;
        }

        const validPositions = Array.isArray(positions) ? positions : [];

        positionsCache.set(cacheKey, {
          positions: validPositions,
          timestamp: Date.now(),
        });

        cleanExpiredCache();

        setState({ positions: validPositions, isLoading: false, error: null });
      } catch (err) {
        if (
          requestIdRef.current !== currentRequestId ||
          !isMountedRef.current
        ) {
          return;
        }

        setState({
          positions: [],
          isLoading: false,
          error:
            err instanceof Error ? err.message : 'Failed to fetch positions',
        });
      }
    }, [isPerpsEnabled, cacheKey, userAddress]);

    const refresh = useCallback(async () => {
      if (cacheKey) {
        positionsCache.delete(cacheKey);
      }
      await fetchPositions();
    }, [cacheKey, fetchPositions]);

    // Fetch on mount and when account changes
    useEffect(() => {
      isMountedRef.current = true;

      if (!isPerpsEnabled || !userAddress) {
        setState({ positions: [], isLoading: false, error: null });
        return () => {
          isMountedRef.current = false;
        };
      }

      // Reset state immediately on account change so stale positions don't linger
      const cached = cacheKey ? positionsCache.get(cacheKey) : null;
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        setState({
          positions: cached.positions,
          isLoading: false,
          error: null,
        });
      } else {
        setState({ positions: [], isLoading: true, error: null });
      }

      fetchPositions();

      return () => {
        isMountedRef.current = false;
      };
    }, [isPerpsEnabled, userAddress, cacheKey, fetchPositions]);

    // Subscribe to cache invalidation
    useEffect(() => {
      let invalidationTimeout: ReturnType<typeof setTimeout> | null = null;

      const handleInvalidation = () => {
        if (invalidationTimeout) {
          clearTimeout(invalidationTimeout);
        }
        invalidationTimeout = setTimeout(() => {
          _clearPositionsCache();
          if (cacheKey && userAddress && isMountedRef.current) {
            fetchPositions();
          }
        }, 10);
      };

      const unsubPositions = PerpsCacheInvalidator.subscribe(
        'positions',
        handleInvalidation,
      );

      return () => {
        if (invalidationTimeout) {
          clearTimeout(invalidationTimeout);
        }
        unsubPositions();
      };
    }, [cacheKey, userAddress, fetchPositions]);

    return {
      positions: state.positions,
      isLoading: state.isLoading,
      error: state.error,
      refresh,
    };
  };

export default usePerpsPositionsStandalone;
