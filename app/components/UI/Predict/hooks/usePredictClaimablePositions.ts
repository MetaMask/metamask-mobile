import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { PredictPosition } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

interface UsePredictClaimablePositionsOptions {
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
export function usePredictClaimablePositions(
  options: UsePredictClaimablePositionsOptions = {},
): UsePredictPositionsReturn {
  const { providerId, loadOnMount = true, refreshOnFocus = true } = options;

  const { getClaimablePositions } = usePredictTrading();

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
        const positionsData = await getClaimablePositions({
          address: selectedInternalAccountAddress,
          providerId,
        });

        setPositions(positionsData);

        DevLogger.log('usePredictPositions: Loaded positions', {
          originalCount: positionsData.length,
          filteredCount: positionsData.length,
          positions: positionsData.map((p) => ({
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
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getClaimablePositions, selectedInternalAccountAddress, providerId],
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
