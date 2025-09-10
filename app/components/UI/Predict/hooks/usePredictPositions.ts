import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { PredictPosition } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

interface UsePredictPositionsOptions {
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
   * Callback when positions are loaded successfully
   */
  onSuccess?: (positions: PredictPosition[]) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
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
    loadOnMount = true,
    refreshOnFocus = true,
    onSuccess,
    onError,
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
          setPositions([]);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // Get positions from Predict controller
        const positionsData = await getPositions({
          address: selectedInternalAccountAddress ?? '',
        });
        const validPositions = positionsData ?? [];
        setPositions(validPositions);

        DevLogger.log('usePredictPositions: Loaded positions', {
          count: validPositions.length,
          positions: validPositions.map((p) => ({
            size: p.size,
            conditionId: p.conditionId,
            outcomeIndex: p.outcomeIndex,
            price: p.curPrice,
          })),
        });

        onSuccess?.(validPositions);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load positions';
        setError(errorMessage);
        DevLogger.log('usePredictPositions: Error loading positions', err);

        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getPositions, selectedInternalAccountAddress, onSuccess, onError],
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

  return {
    positions,
    isLoading,
    isRefreshing,
    error,
    loadPositions,
  };
}
