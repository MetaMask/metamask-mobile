import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { Position } from '@metamask/perps-controller';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsNetwork } from './usePerpsNetwork';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { PerpsCacheInvalidator } from '../services/PerpsCacheInvalidator';

/**
 * Result interface for usePerpsPositionForAsset hook
 */
export interface UsePerpsPositionForAssetResult {
  /** Position data if user has an open position for this asset */
  position: Position | null;
  /** Whether the user has any open perps positions */
  hasFundsInPerps: boolean;
  /** Whether the hook is still loading */
  isLoading: boolean;
  /** Error message if position lookup failed */
  error: string | null;
}

// Module-level cache for position checks
// Persists across component mounts/unmounts for efficient re-use
const positionCache = new Map<
  string,
  {
    position: Position | null;
    hasFundsInPerps: boolean;
    timestamp: number;
  }
>();

// Cache TTL: 30 seconds (shorter than market cache due to position changes)
const CACHE_TTL_MS = 30 * 1000;

/**
 * Clear expired entries from the cache
 */
const cleanExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of positionCache.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      positionCache.delete(key);
    }
  }
};

/**
 * Clear all cache entries - exported for testing purposes only
 * @internal
 */
export const _clearPositionCache = (): void => {
  positionCache.clear();
};

/**
 * usePerpsPositionForAsset Hook
 *
 * Efficiently checks if a user has an open perps position for a specific asset.
 * Designed for use outside of perps screens (e.g., spot asset details page).
 *
 * Key Features:
 * - Module-level caching to avoid repeated API calls
 * - Uses standalone mode - works without full perps initialization (no wallet/WebSocket)
 * - Only calls getPositions (not getAccountState) to minimise Hyperliquid API calls
 * - 30s cache TTL (shorter than market cache due to position volatility)
 *
 * @param symbol - Token symbol (e.g., 'ETH', 'BTC')
 * @returns Object with position, hasFundsInPerps, isLoading, error
 *
 * @example
 * ```tsx
 * const { position, isLoading } = usePerpsPositionForAsset('ETH');
 *
 * if (position) {
 *   return <PerpsPositionCard position={position} />;
 * }
 * ```
 */
export const usePerpsPositionForAsset = (
  symbol: string | undefined | null,
): UsePerpsPositionForAssetResult => {
  const { getPositions } = usePerpsTrading();
  const perpsNetwork = usePerpsNetwork();
  const evmAccount = useSelector(selectSelectedAccountGroupEvmInternalAccount);
  const userAddress = evmAccount?.address;

  // Track if component is still mounted
  const isMountedRef = useRef(true);

  // Track current request to prevent stale responses from updating state
  const requestIdRef = useRef(0);

  // Normalize symbol for lookup
  const lookupSymbol = symbol?.toUpperCase() ?? null;

  // Create cache key with user address and network context
  const cacheKey =
    lookupSymbol && userAddress
      ? `${userAddress}_${lookupSymbol}_${perpsNetwork}`
      : null;

  const [state, setState] = useState<{
    position: Position | null;
    hasFundsInPerps: boolean;
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Initialize from cache if available
    if (!cacheKey) {
      return {
        position: null,
        hasFundsInPerps: false,
        isLoading: false,
        error: null,
      };
    }

    const cached = positionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        position: cached.position,
        hasFundsInPerps: cached.hasFundsInPerps,
        isLoading: false,
        error: null,
      };
    }

    return {
      position: null,
      hasFundsInPerps: false,
      isLoading: true,
      error: null,
    };
  });

  const checkPositionExists = useCallback(async () => {
    if (!lookupSymbol || !cacheKey || !userAddress) {
      return;
    }

    // Capture current request ID to detect stale responses
    const currentRequestId = ++requestIdRef.current;

    // Check cache first (includes user address and network context)
    const cached = positionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (isMountedRef.current) {
        setState({
          position: cached.position,
          hasFundsInPerps: cached.hasFundsInPerps,
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    try {
      const positions = await getPositions({
        standalone: true,
        userAddress,
      });

      // Verify this response matches current request (prevents stale updates)
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      // Find position matching the symbol
      const matchedPosition = positions.find(
        (pos) => pos.symbol.toUpperCase() === lookupSymbol,
      );

      const hasFundsInPerps = positions.length > 0;

      // Cache the result
      positionCache.set(cacheKey, {
        position: matchedPosition || null,
        hasFundsInPerps,
        timestamp: Date.now(),
      });

      // Periodic cache cleanup
      cleanExpiredCache();

      setState({
        position: matchedPosition || null,
        hasFundsInPerps,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      // Verify this error is for current request
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      DevLogger.log('usePerpsPositionForAsset: Error checking position:', err);

      // On error, don't cache - allow retry
      // Silent failure: return empty state (discovery banner will show)
      setState({
        position: null,
        hasFundsInPerps: false,
        isLoading: false,
        error:
          err instanceof Error ? err.message : 'Failed to check perps position',
      });
    }
  }, [lookupSymbol, cacheKey, userAddress, getPositions]);

  // Track mount state - only set once on mount, cleared on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Effect to check position existence
  useEffect(() => {
    // Early bail for missing data
    if (!cacheKey || !userAddress) {
      setState({
        position: null,
        hasFundsInPerps: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Check if already cached (includes user address and network context)
    const cached = positionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setState({
        position: cached.position,
        hasFundsInPerps: cached.hasFundsInPerps,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Need to fetch
    setState((prev) => ({ ...prev, isLoading: true }));
    checkPositionExists();
  }, [cacheKey, userAddress, checkPositionExists]);

  // Subscribe to cache invalidation events
  // When positions or account state change in perps, clear cache and re-fetch
  useEffect(() => {
    // Debounce invalidation to prevent duplicate API calls when both
    // positions and accountState are invalidated together (common after trades)
    let invalidationTimeout: ReturnType<typeof setTimeout> | null = null;

    // Handler that clears cache and triggers a re-fetch (debounced)
    const handleInvalidation = () => {
      // Clear any pending invalidation
      if (invalidationTimeout) {
        clearTimeout(invalidationTimeout);
      }
      // Debounce: wait briefly to batch multiple invalidations
      invalidationTimeout = setTimeout(() => {
        _clearPositionCache();
        // Only re-fetch if we have the necessary data
        if (cacheKey && userAddress && isMountedRef.current) {
          checkPositionExists();
        }
      }, 10); // 10ms debounce - enough to batch synchronous invalidations
    };

    // Subscribe to both positions and accountState invalidation
    const unsubPositions = PerpsCacheInvalidator.subscribe(
      'positions',
      handleInvalidation,
    );
    const unsubAccountState = PerpsCacheInvalidator.subscribe(
      'accountState',
      handleInvalidation,
    );

    return () => {
      if (invalidationTimeout) {
        clearTimeout(invalidationTimeout);
      }
      unsubPositions();
      unsubAccountState();
    };
  }, [cacheKey, userAddress, checkPositionExists]);

  return {
    position: state.position,
    hasFundsInPerps: state.hasFundsInPerps,
    isLoading: state.isLoading,
    error: state.error,
  };
};
