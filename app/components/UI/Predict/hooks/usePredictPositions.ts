import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { captureException } from '@sentry/react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { PredictPosition } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

interface UsePredictPositionsOptions {
  /**
   * The provider ID to load positions for
   */
  providerId?: string;
  /**
   * Whether to load positions on mount
   * @default true
   */
  loadOnMount?: boolean;
  /**
   * Whether to refresh positions when screen comes into focus
   * @default true
   */
  refreshOnFocus?: boolean;
  /**
   * The market ID to load positions for
   */
  marketId?: string;

  /**
   * The parameters to load positions for
   */
  claimable?: boolean;
  /**
   * Auto-refresh interval in milliseconds
   * If provided, positions will be automatically refreshed at this interval
   */
  autoRefreshTimeout?: number;
}

interface UsePredictPositionsReturn {
  positions: PredictPosition[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadPositions: (options?: { isRefresh?: boolean }) => Promise<void>;
}

/**
 * Hook for managing Predict positions data with loading states
 * @param options Configuration options for the hook
 * @returns Positions data and loading utilities
 */
export function usePredictPositions(
  options: UsePredictPositionsOptions = {},
): UsePredictPositionsReturn {
  const {
    providerId,
    loadOnMount = true,
    refreshOnFocus = true,
    claimable = false,
    marketId,
    autoRefreshTimeout,
  } = options;

  const { getPositions } = usePredictTrading();

  const [positions, setPositions] = useState<PredictPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const loadPositions = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
          setPositions([]);
        }
        setError(null);

        // Get positions from Predict controller
        const positionsData = await getPositions({
          address: selectedInternalAccountAddress,
          providerId,
          claimable,
          marketId,
        });
        const validPositions = positionsData ?? [];

        setPositions(validPositions);

        DevLogger.log('usePredictPositions: Loaded positions', {
          originalCount: validPositions.length,
          filteredCount: validPositions.length,
          positions: validPositions.map((p) => ({
            size: p.size,
            outcomeId: p.outcomeId,
            outcomeIndex: p.outcomeIndex,
            price: p.price,
          })),
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load positions';
        setError(errorMessage);
        DevLogger.log('usePredictPositions: Error loading positions', err);

        // Capture exception with positions loading context (no user address)
        captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: {
            component: 'usePredictPositions',
            action: 'positions_load',
            operation: 'data_fetching',
          },
          extra: {
            positionsContext: {
              providerId,
              claimable,
              marketId,
            },
          },
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      getPositions,
      selectedInternalAccountAddress,
      providerId,
      claimable,
      marketId,
    ],
  );

  // Load positions on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadPositions();
    }
  }, [loadOnMount, loadPositions]);

  // Refresh positions when screen comes into focus if enabled
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        // Refresh positions data when returning to this screen
        // Use refresh mode to avoid showing loading spinner
        loadPositions({ isRefresh: true });
      }
    }, [refreshOnFocus, loadPositions]),
  );

  // Store loadPositions in a ref for auto-refresh
  const loadPositionsRef = useRef(loadPositions);
  loadPositionsRef.current = loadPositions;

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefreshTimeout) {
      return;
    }

    const refreshTimer = setInterval(() => {
      loadPositionsRef.current({ isRefresh: true });
    }, autoRefreshTimeout);

    return () => {
      clearInterval(refreshTimer);
    };
  }, [autoRefreshTimeout]);

  return {
    positions,
    isLoading,
    isRefreshing,
    error,
    loadPositions,
  };
}
