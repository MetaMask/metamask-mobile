import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import type { Order, CancelOrdersResult } from '../controllers/types';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';

export interface UsePerpsCancelAllOrdersOptions {
  /** Callback invoked when cancellation succeeds */
  onSuccess?: (result: CancelOrdersResult) => void;
  /** Callback invoked when cancellation fails */
  onError?: (error: Error) => void;
  /** Whether to navigate back on success (default: true) */
  navigateBackOnSuccess?: boolean;
}

export interface UsePerpsCancelAllOrdersReturn {
  /** Whether cancellation is in progress */
  isCanceling: boolean;
  /** Number of orders to cancel */
  orderCount: number;
  /** Cancel all orders */
  handleCancelAll: () => Promise<void>;
  /** Keep orders and navigate back */
  handleKeepOrders: () => void;
  /** Last error that occurred */
  error: Error | null;
}

/**
 * Hook for managing cancel all orders business logic
 *
 * Handles:
 * - Cancellation state management
 * - Controller interaction
 * - Error handling
 * - Success/partial success/failure logic
 * - Navigation
 *
 * @param orders - Array of orders to cancel
 * @param options - Configuration options
 * @returns Cancel all orders state and handlers
 */
export const usePerpsCancelAllOrders = (
  orders: Order[] | null,
  options?: UsePerpsCancelAllOrdersOptions,
): UsePerpsCancelAllOrdersReturn => {
  const navigation = useNavigation();
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { onSuccess, onError, navigateBackOnSuccess = true } = options || {};

  const orderCount = orders?.length || 0;

  const handleCancelAll = useCallback(async () => {
    if (!orders || orders.length === 0) {
      DevLogger.log('[usePerpsCancelAllOrders] No orders to cancel');
      return;
    }

    setIsCanceling(true);
    setError(null);

    DevLogger.log('[usePerpsCancelAllOrders] Starting cancel all orders', {
      orderCount: orders.length,
    });

    try {
      const result = await Engine.context.PerpsController.cancelOrders({
        cancelAll: true,
      });

      DevLogger.log('[usePerpsCancelAllOrders] Cancel result', {
        success: result.success,
        successCount: result.successCount,
        failureCount: result.failureCount,
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
          strings('perps.cancel_all_modal.error_message', {
            count: result.failureCount,
          }),
        );
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);

      DevLogger.log('[usePerpsCancelAllOrders] Cancel failed', {
        error: errorObj.message,
      });

      // Invoke error callback if provided
      if (onError) {
        onError(errorObj);
      }
    } finally {
      setIsCanceling(false);
    }
  }, [orders, onSuccess, onError, navigateBackOnSuccess, navigation]);

  const handleKeepOrders = useCallback(() => {
    DevLogger.log('[usePerpsCancelAllOrders] User chose to keep orders');
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
    isCanceling,
    orderCount,
    handleCancelAll,
    handleKeepOrders,
    error,
  };
};
