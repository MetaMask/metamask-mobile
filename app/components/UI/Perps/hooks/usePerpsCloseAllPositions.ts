import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { Position, ClosePositionsResult } from '../controllers/types';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

export interface UsePerpsCloseAllPositionsOptions {
  /** Callback invoked when closing succeeds */
  onSuccess?: (result: ClosePositionsResult) => void;
  /** Callback invoked when closing fails */
  onError?: (error: Error) => void;
  /** Whether to navigate back on success (default: true) */
  navigateBackOnSuccess?: boolean;
  /** Additional metadata for logging */
  calculations?: {
    totalMargin?: string;
    totalPnl?: string;
    totalFees?: string;
    receiveAmount?: string;
  };
}

export interface UsePerpsCloseAllPositionsReturn {
  /** Whether closing is in progress */
  isClosing: boolean;
  /** Number of positions to close */
  positionCount: number;
  /** Close all positions */
  handleCloseAll: () => Promise<void>;
  /** Keep positions and navigate back */
  handleKeepPositions: () => void;
  /** Last error that occurred */
  error: Error | null;
}

/**
 * Hook for managing close all positions business logic
 *
 * Handles:
 * - Closing state management
 * - Controller interaction
 * - Error handling
 * - Success/partial success/failure logic
 * - Navigation
 * - Performance logging
 *
 * @param positions - Array of positions to close
 * @param options - Configuration options
 * @returns Close all positions state and handlers
 */
export const usePerpsCloseAllPositions = (
  positions: Position[] | null,
  options?: UsePerpsCloseAllPositionsOptions,
): UsePerpsCloseAllPositionsReturn => {
  const navigation = useNavigation();
  const [isClosing, setIsClosing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    onSuccess,
    onError,
    navigateBackOnSuccess = true,
    calculations,
  } = options || {};

  const positionCount = positions?.length || 0;

  const handleCloseAll = useCallback(async () => {
    if (!positions || positions.length === 0) {
      DevLogger.log('[usePerpsCloseAllPositions] No positions to close');
      return;
    }

    const startTime = Date.now();
    setIsClosing(true);
    setError(null);

    DevLogger.log('[usePerpsCloseAllPositions] Starting close all positions', {
      positionCount: positions.length,
      totalMargin: calculations?.totalMargin,
      totalPnl: calculations?.totalPnl,
      estimatedTotalFees: calculations?.totalFees,
      estimatedReceiveAmount: calculations?.receiveAmount,
    });

    try {
      const result = await Engine.context.PerpsController.closePositions({
        closeAll: true,
      });

      const executionTime = Date.now() - startTime;

      DevLogger.log('[usePerpsCloseAllPositions] Close result', {
        success: result.success,
        successCount: result.successCount,
        failureCount: result.failureCount,
        executionTimeMs: executionTime,
      });

      // Invoke success callback if provided
      if (onSuccess) {
        onSuccess(result);
      }

      // Navigate back on any success (full or partial)
      if (navigateBackOnSuccess && result.successCount > 0) {
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          // Fallback: navigate to Markets view if can't go back
          navigation.navigate(Routes.PERPS.ROOT, {
            screen: Routes.PERPS.PERPS_HOME,
          });
        }
      }

      // If complete failure, throw error to trigger catch block
      if (result.successCount === 0 && result.failureCount > 0) {
        throw new Error(
          strings('perps.close_all_modal.error_message', {
            count: result.failureCount,
          }),
        );
      }
    } catch (err) {
      const executionTime = Date.now() - startTime;
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);

      DevLogger.log('[usePerpsCloseAllPositions] Close failed', {
        error: errorObj.message,
        errorStack: errorObj.stack,
        executionTimeMs: executionTime,
      });

      // Invoke error callback if provided
      if (onError) {
        onError(errorObj);
      }
    } finally {
      setIsClosing(false);
    }
  }, [
    positions,
    calculations,
    onSuccess,
    onError,
    navigateBackOnSuccess,
    navigation,
  ]);

  const handleKeepPositions = useCallback(() => {
    DevLogger.log('[usePerpsCloseAllPositions] User chose to keep positions');
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback: navigate to Markets view if can't go back
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    }
  }, [navigation]);

  return {
    isClosing,
    positionCount,
    handleCloseAll,
    handleKeepPositions,
    error,
  };
};
