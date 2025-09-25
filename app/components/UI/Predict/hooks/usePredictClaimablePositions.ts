import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type { PredictPosition } from '../types';
import { usePredictTrading } from './usePredictTrading';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { usePredictClaim } from './usePredictClaim';
import Engine from '../../../../core/Engine';

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

interface UsePredictClaimablePositionsReturn {
  claimablePositions: PredictPosition[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadPositions: (options?: { isRefresh?: boolean }) => Promise<void>;
}

/**
 * Hook for managing Predict claimable positions data with loading states
 * @param options Configuration options for the hook
 * @returns Claimable positions data and loading utilities
 */
export function usePredictClaimablePositions(
  options: UsePredictClaimablePositionsOptions = {},
): UsePredictClaimablePositionsReturn {
  const { providerId, loadOnMount = true, refreshOnFocus = true } = options;

  const { getPositions } = usePredictTrading();

  const [positions, setPositions] = useState<PredictPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const { completedClaimPositionIds } = usePredictClaim();

  const claimablePositions = useMemo(
    () =>
      positions.filter(
        (position) => !completedClaimPositionIds.has(position.id),
      ),
    [positions, completedClaimPositionIds],
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
        let validPositions =
          (await getPositions({
            address: selectedInternalAccountAddress ?? '',
            providerId,
            claimable: true,
          })) ?? [];

        // Check if loaded positions contain any that have been claimed
        const hasCompletedPositions = validPositions.some((position) =>
          completedClaimPositionIds.has(position.id),
        );

        // If positions still contain claimed ones, retry up to 3 times with 3-second intervals
        if (hasCompletedPositions && completedClaimPositionIds.size > 0) {
          for (let attempt = 0; attempt < 3; attempt++) {
            DevLogger.log(
              'usePredictClaimablePositions: Positions still contain claimed ones, retrying',
              {
                attempt: attempt + 1,
                completedPositionIds: Array.from(completedClaimPositionIds),
                currentPositions: validPositions.map((p) => p.id),
              },
            );

            // Wait 3 seconds before retry
            await new Promise((resolve) => setTimeout(resolve, 3000));

            const retryPositionsData = await getPositions({
              address: selectedInternalAccountAddress ?? '',
              providerId,
              claimable: true,
            });
            const retryValidPositions = retryPositionsData ?? [];

            // Check if retry positions still contain claimed ones
            const retryHasCompletedPositions = retryValidPositions.some(
              (position) => completedClaimPositionIds.has(position.id),
            );

            if (!retryHasCompletedPositions) {
              // Success! Backend has updated, clear claim transactions
              DevLogger.log(
                'usePredictClaimablePositions: Backend updated, clearing claim transactions',
              );
              Engine.context.PredictController.clearClaimTransactions();
              validPositions = retryValidPositions;
              break;
            }

            validPositions = retryValidPositions;
          }
        }

        setPositions(validPositions);

        DevLogger.log('usePredictClaimablePositions: Loaded positions', {
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
          err instanceof Error
            ? err.message
            : 'Failed to load claimable positions';
        setError(errorMessage);
        DevLogger.log(
          'usePredictClaimablePositions: Error loading positions',
          err,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [
      getPositions,
      selectedInternalAccountAddress,
      providerId,
      completedClaimPositionIds,
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

  return {
    claimablePositions,
    isLoading,
    isRefreshing,
    error,
    loadPositions,
  };
}
