import { useCallback, useState } from 'react';
import type { TwapOrder } from '@metamask/perps-controller';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import usePerpsToasts from './usePerpsToasts';

export interface UsePerpsTerminateTwapOptions {
  /** Invoked after the venue accepts the termination. */
  onSuccess?: (twapOrder: TwapOrder) => void;
  onError?: (error: Error, twapOrder: TwapOrder) => void;
}

export interface UsePerpsTerminateTwapReturn {
  /** The schedule currently being terminated, or null when idle. */
  terminatingOrderId: string | null;
  terminateTwap: (twapOrder: TwapOrder) => Promise<void>;
}

/**
 * Terminate a running TWAP schedule.
 *
 * A TWAP is cancelled through the ordinary `cancelOrder` path discriminated by
 * `orderType: 'twap'`, which the controller routes to the venue's TWAP cancel
 * endpoint rather than an order-book cancel. The remaining size stops
 * executing; size already filled stays as a position.
 */
export const usePerpsTerminateTwap = (
  options: UsePerpsTerminateTwapOptions = {},
): UsePerpsTerminateTwapReturn => {
  const { onSuccess, onError } = options;
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const [terminatingOrderId, setTerminatingOrderId] = useState<string | null>(
    null,
  );

  const terminateTwap = useCallback(
    async (twapOrder: TwapOrder): Promise<void> => {
      setTerminatingOrderId(twapOrder.orderId);

      try {
        const result = await Engine.context.PerpsController.cancelOrder({
          orderId: twapOrder.orderId,
          symbol: twapOrder.symbol,
          orderType: 'twap',
        });

        if (!result.success) {
          throw new Error(result.error ?? 'TWAP termination failed');
        }

        // Pass the schedule's direction and executed size so the toast names
        // what was filled. Without them the shared copy falls through to
        // "funds are available to trade", which contradicts the terminate
        // sheet's warning that already-filled size stays as a position.
        const executedSize = Number.parseFloat(twapOrder.executedSize);
        const hasFills = Number.isFinite(executedSize) && executedSize > 0;
        showToast(
          PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            twapOrder.reduceOnly,
            undefined,
            hasFills
              ? twapOrder.side === 'buy'
                ? 'long'
                : 'short'
              : undefined,
            hasFills ? twapOrder.executedSize : undefined,
            hasFills ? twapOrder.symbol : undefined,
          ),
        );
        onSuccess?.(twapOrder);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        DevLogger.log('Perps: Failed to terminate TWAP', error);
        showToast(PerpsToastOptions.orderManagement.shared.cancellationFailed);
        onError?.(error, twapOrder);
      } finally {
        setTerminatingOrderId(null);
      }
    },
    [PerpsToastOptions, onError, onSuccess, showToast],
  );

  return { terminatingOrderId, terminateTwap };
};
