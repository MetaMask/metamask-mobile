import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from '../providers/PerpsConnectionProvider';
import type { Position } from '../controllers/types';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

interface UsePerpsPositionsOptions {
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
  onSuccess?: (positions: Position[]) => void;
  /**
   * Callback when an error occurs
   */
  onError?: (error: string) => void;
}

interface UsePerpsPositionsReturn {
  positions: Position[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadPositions: (options?: { isRefresh?: boolean }) => Promise<void>;
}

/**
 * Hook for managing positions data with loading states
 * @param options Configuration options for the hook
 * @returns Positions data and loading utilities
 */
export function usePerpsPositions(
  options: UsePerpsPositionsOptions = {},
): UsePerpsPositionsReturn {
  const {
    loadOnMount = true,
    refreshOnFocus = true,
    onSuccess,
    onError,
  } = options;

  const { getPositions } = usePerpsTrading();
  const { isConnected, isInitialized } = usePerpsConnection();

  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPositions = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};

      // Check if connection is initialized before attempting to load
      if (!isConnected || !isInitialized) {
        DevLogger.log(
          'usePerpsPositions: Skipping load - connection not ready',
          {
            isConnected,
            isInitialized,
          },
        );
        // Keep loading state true if this is the initial load
        if (!isRefresh) {
          setIsLoading(true);
        }
        return;
      }

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // Get positions from controller
        const positionsData = await getPositions();
        const validPositions = positionsData || [];
        setPositions(validPositions);

        DevLogger.log('usePerpsPositions: Loaded positions', {
          count: validPositions.length,
          positions: validPositions.map((p) => ({
            coin: p.coin,
            size: p.size,
            pnl: p.unrealizedPnl,
          })),
        });

        // Call success callback if provided
        onSuccess?.(validPositions);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load positions';
        setError(errorMessage);
        DevLogger.log('usePerpsPositions: Error loading positions', err);

        // Call error callback if provided
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getPositions, onSuccess, onError, isConnected, isInitialized],
  );

  // Load positions when connection is ready and on mount if enabled
  useEffect(() => {
    if (loadOnMount && isConnected && isInitialized) {
      loadPositions();
    }
  }, [loadOnMount, isConnected, isInitialized, loadPositions]);

  // Refresh positions when screen comes into focus if enabled
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus && isConnected && isInitialized) {
        // Refresh positions data when returning to this screen
        loadPositions({ isRefresh: true }); // Use refresh mode to avoid showing loading spinner
      }
    }, [refreshOnFocus, isConnected, isInitialized, loadPositions]),
  );

  return {
    positions,
    isLoading,
    isRefreshing,
    error,
    loadPositions,
  };
}
