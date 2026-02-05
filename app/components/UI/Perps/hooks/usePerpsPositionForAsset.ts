import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { AccountState, Position } from '../controllers/types';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsNetwork } from './usePerpsNetwork';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';

/**
 * Result interface for usePerpsPositionForAsset hook
 */
export interface UsePerpsPositionForAssetResult {
  /** Position data if user has an open position for this asset */
  position: Position | null;
  /** Whether the user has any funds in perps (balance > 0) */
  hasFundsInPerps: boolean;
  /** Account state for perps (balance, margin, etc.) */
  accountState: AccountState | null;
  /** Whether the hook is still loading */
  isLoading: boolean;
  /** Error message if position lookup failed */
  error: string | null;
}

// Module-level cache for position/account checks
// Persists across component mounts/unmounts for efficient re-use
const positionCache = new Map<
  string,
  {
    position: Position | null;
    accountState: AccountState | null;
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
 * - Uses readOnly mode - works without full perps initialization (no wallet/WebSocket)
 * - Queries positions and account state in parallel for efficiency
 * - 30s cache TTL (shorter than market cache due to position volatility)
 *
 * @param symbol - Token symbol (e.g., 'ETH', 'BTC')
 * @returns Object with position, hasFundsInPerps, accountState, isLoading, error
 *
 * @example
 * ```tsx
 * const { position, hasFundsInPerps, isLoading } = usePerpsPositionForAsset('ETH');
 *
 * if (position) {
 *   return <PerpsPositionCard position={position} onPress={handleNavigate} />;
 * } else if (hasFundsInPerps) {
 *   return <PerpsDiscoveryBanner ... />;
 * }
 * ```
 */
export const usePerpsPositionForAsset = (
  symbol: string | undefined | null,
): UsePerpsPositionForAssetResult => {
  const { getPositions, getAccountState } = usePerpsTrading();
  const perpsNetwork = usePerpsNetwork();
  const userAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

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
    accountState: AccountState | null;
    hasFundsInPerps: boolean;
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Initialize from cache if available
    if (!cacheKey) {
      return {
        position: null,
        accountState: null,
        hasFundsInPerps: false,
        isLoading: false,
        error: null,
      };
    }

    const cached = positionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        position: cached.position,
        accountState: cached.accountState,
        hasFundsInPerps: cached.hasFundsInPerps,
        isLoading: false,
        error: null,
      };
    }

    return {
      position: null,
      accountState: null,
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
          accountState: cached.accountState,
          hasFundsInPerps: cached.hasFundsInPerps,
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    try {
      // Fetch positions and account state in parallel using readOnly mode
      // readOnly: true bypasses full initialization (no wallet/WebSocket needed)
      const [positions, accountState] = await Promise.all([
        getPositions({
          readOnly: true,
          userAddress,
        }),
        getAccountState({
          readOnly: true,
          userAddress,
        }),
      ]);

      // Verify this response matches current request (prevents stale updates)
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      // Find position matching the symbol
      const matchedPosition = positions.find(
        (pos) => pos.symbol.toUpperCase() === lookupSymbol,
      );

      // Check if user has any funds in perps (total balance > 0)
      const totalBalance = parseFloat(accountState?.totalBalance || '0');
      const hasFundsInPerps = totalBalance > 0;

      // Cache the result
      positionCache.set(cacheKey, {
        position: matchedPosition || null,
        accountState,
        hasFundsInPerps,
        timestamp: Date.now(),
      });

      // Periodic cache cleanup
      cleanExpiredCache();

      setState({
        position: matchedPosition || null,
        accountState,
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
        accountState: null,
        hasFundsInPerps: false,
        isLoading: false,
        error:
          err instanceof Error ? err.message : 'Failed to check perps position',
      });
    }
  }, [lookupSymbol, cacheKey, userAddress, getPositions, getAccountState]);

  // Effect to check position existence
  useEffect(() => {
    isMountedRef.current = true;

    // Cleanup function to prevent state updates after unmount
    const cleanup = () => {
      isMountedRef.current = false;
    };

    // Early bail for missing data
    if (!cacheKey || !userAddress) {
      setState({
        position: null,
        accountState: null,
        hasFundsInPerps: false,
        isLoading: false,
        error: null,
      });
      return cleanup;
    }

    // Check if already cached (includes user address and network context)
    const cached = positionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setState({
        position: cached.position,
        accountState: cached.accountState,
        hasFundsInPerps: cached.hasFundsInPerps,
        isLoading: false,
        error: null,
      });
      return cleanup;
    }

    // Need to fetch
    setState((prev) => ({ ...prev, isLoading: true }));
    checkPositionExists();

    return cleanup;
  }, [cacheKey, userAddress, checkPositionExists]);

  return {
    position: state.position,
    hasFundsInPerps: state.hasFundsInPerps,
    accountState: state.accountState,
    isLoading: state.isLoading,
    error: state.error,
  };
};
