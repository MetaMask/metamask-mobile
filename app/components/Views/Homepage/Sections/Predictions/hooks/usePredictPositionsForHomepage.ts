import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../../../core/Engine';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { selectPredictEnabledFlag } from '../../../../../UI/Predict';
import type { PredictPosition } from '../../../../../UI/Predict/types';

export interface UsePredictPositionsForHomepageResult {
  positions: PredictPosition[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

interface CacheEntry {
  positions: PredictPosition[];
  timestamp: number;
}

// Module-level cache for positions data
const positionsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute TTL for positions (shorter than markets)

/**
 * Clean expired entries from cache
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
 * Clear the positions cache (useful for testing or forced refresh)
 */
export const _clearPositionsCache = (): void => {
  positionsCache.clear();
};

/**
 * Lightweight hook for fetching user prediction positions for the homepage.
 *
 * Uses module-level caching to avoid redundant API calls.
 * Returns active (non-claimable) positions only.
 *
 * @param maxPositions - Maximum number of positions to return
 * @returns Positions data, loading state, and refresh function
 */
export const usePredictPositionsForHomepage = (
  maxPositions = 5,
): UsePredictPositionsForHomepageResult => {
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const userAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const isMountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const cacheKey = userAddress ? `predict_positions_${userAddress}` : null;

  const [state, setState] = useState<{
    positions: PredictPosition[];
    isLoading: boolean;
    error: string | null;
  }>(() => {
    // Check cache on initial render
    if (!cacheKey || !isPredictEnabled) {
      return { positions: [], isLoading: false, error: null };
    }

    const cached = positionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return {
        positions: cached.positions.slice(0, maxPositions),
        isLoading: false,
        error: null,
      };
    }

    return { positions: [], isLoading: true, error: null };
  });

  const fetchPositions = useCallback(async () => {
    if (!isPredictEnabled || !cacheKey || !userAddress) {
      setState({ positions: [], isLoading: false, error: null });
      return;
    }

    const currentRequestId = ++requestIdRef.current;

    // Check cache first
    const cached = positionsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (isMountedRef.current) {
        setState({
          positions: cached.positions.slice(0, maxPositions),
          isLoading: false,
          error: null,
        });
      }
      return;
    }

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const controller = Engine.context.PredictController;
      const positionsData = await controller.getPositions({
        address: userAddress,
        claimable: false, // Only active positions
      });

      // Check if this request is still valid
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      const validPositions = positionsData || [];

      // Update cache
      positionsCache.set(cacheKey, {
        positions: validPositions,
        timestamp: Date.now(),
      });

      cleanExpiredCache();

      setState({
        positions: validPositions.slice(0, maxPositions),
        isLoading: false,
        error: null,
      });
    } catch (err) {
      if (requestIdRef.current !== currentRequestId || !isMountedRef.current) {
        return;
      }

      setState({
        positions: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to fetch positions',
      });
    }
  }, [isPredictEnabled, cacheKey, userAddress, maxPositions]);

  const refresh = useCallback(async () => {
    // Clear cache and refetch
    if (cacheKey) {
      positionsCache.delete(cacheKey);
    }
    await fetchPositions();
  }, [cacheKey, fetchPositions]);

  // Initial fetch
  useEffect(() => {
    isMountedRef.current = true;

    if (!isPredictEnabled || !userAddress) {
      setState({ positions: [], isLoading: false, error: null });
      return () => {
        isMountedRef.current = false;
      };
    }

    fetchPositions();

    return () => {
      isMountedRef.current = false;
    };
  }, [isPredictEnabled, userAddress, fetchPositions]);

  return {
    positions: state.positions,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
  };
};

export default usePredictPositionsForHomepage;
