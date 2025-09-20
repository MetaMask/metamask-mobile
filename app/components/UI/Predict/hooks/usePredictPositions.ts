import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
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
  const { providerId, loadOnMount = true, refreshOnFocus = true } = options;

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
          providerId,
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
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load positions';
        setError(errorMessage);
        DevLogger.log('usePredictPositions: Error loading positions', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getPositions, selectedInternalAccountAddress, providerId],
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
