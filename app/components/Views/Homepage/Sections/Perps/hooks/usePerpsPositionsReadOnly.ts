import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { Position } from '../../../../../UI/Perps/controllers/types';
import { usePerpsTrading } from '../../../../../UI/Perps/hooks/usePerpsTrading';
import { usePerpsNetwork } from '../../../../../UI/Perps/hooks/usePerpsNetwork';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { PerpsCacheInvalidator } from '../../../../../UI/Perps/services/PerpsCacheInvalidator';
import { selectPerpsEnabledFlag } from '../../../../../UI/Perps';

/**
 * Result interface for usePerpsPositionsReadOnly hook
 */
export interface UsePerpsPositionsReadOnlyResult {
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
 * usePerpsPositionsReadOnly Hook
 *
 * Fetches open perps positions for the current user using lightweight readOnly mode.
 * Designed for use on the homepage where full perps initialization is not desired.
 *
 * Key Features:
 * - Module-level caching (30s TTL) to avoid repeated API calls
 * - Uses readOnly mode - works without full perps initialization (no wallet/WebSocket)
 * - Subscribes to PerpsCacheInvalidator for automatic refresh after trades
 * - Returns empty array if user has no positions
 *
 * Limitations (from readOnly mode):
 * - Main DEX only (no HIP-3 positions like GOLD, SILVER)
 * - No TP/SL data on positions
 * - No real-time updates (HTTP only)
 *
 * @returns Object with positions, isLoading, error, refresh
 */
export const usePerpsPositionsReadOnly =
  (): UsePerpsPositionsReadOnlyResult => {
    const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
    const { getPositions } = usePerpsTrading();
    const perpsNetwork = usePerpsNetwork();
    const userAddress = useSelector(
      selectSelectedInternalAccountFormattedAddress,
    );

    const isMountedRef = useRef(true);
    const requestIdRef = useRef(0);

    // Cache key includes user address and network
    const cacheKey = userAddress
      ? `positions_${userAddress}_${perpsNetwork}`
      : null;

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

        const positions = await getPositions({
          readOnly: true,
          userAddress,
        });

        if (
          requestIdRef.current !== currentRequestId ||
          !isMountedRef.current
        ) {
          return;
        }

        const validPositions = positions || [];

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
    }, [isPerpsEnabled, cacheKey, userAddress, getPositions]);

    const refresh = useCallback(async () => {
      if (cacheKey) {
        positionsCache.delete(cacheKey);
      }
      await fetchPositions();
    }, [cacheKey, fetchPositions]);

    // Fetch on mount
    useEffect(() => {
      isMountedRef.current = true;

      if (!isPerpsEnabled || !userAddress) {
        setState({ positions: [], isLoading: false, error: null });
        return () => {
          isMountedRef.current = false;
        };
      }

      fetchPositions();

      return () => {
        isMountedRef.current = false;
      };
    }, [isPerpsEnabled, userAddress, fetchPositions]);

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

export default usePerpsPositionsReadOnly;
