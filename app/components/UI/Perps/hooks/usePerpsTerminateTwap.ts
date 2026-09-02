import { useCallback, useEffect, useRef, useState } from 'react';
import type { TwapOrder } from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import usePerpsToasts from './usePerpsToasts';

export interface UsePerpsTerminateTwapOptions {
  /** Invoked after the venue accepts the termination. */
  onSuccess?: (twapOrder: TwapOrder) => void;
  onError?: (error: Error, twapOrder: TwapOrder) => void;
}

export interface UsePerpsTerminateTwapReturn {
  /** Global one-at-a-time cancellation lock for every provider/order target. */
  isTerminationInFlight: boolean;
  terminateTwap: (twapOrder: TwapOrder) => Promise<void>;
}

/**
 * Terminate a running TWAP schedule.
 *
 * A TWAP is cancelled through the ordinary `cancelOrder` path discriminated by
 * `orderType: 'twap'`, which the controller routes to the venue's TWAP cancel
 * endpoint rather than an order-book cancel. The remaining size stops
 * executing; opening fills leave exposure while reduce-only fills have already
 * reduced an existing position.
 */
export const usePerpsTerminateTwap = (
  options: UsePerpsTerminateTwapOptions = {},
): UsePerpsTerminateTwapReturn => {
  const { onSuccess, onError } = options;
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const selectedAddress = useSelector(selectPerpsSelectedAccountAddress);
  const provider = useSelector(selectPerpsProvider);
  const network = useSelector(selectPerpsNetwork);
  const identityKey = `${selectedAddress ?? 'none'}|${provider}|${network}`;
  const [isTerminationInFlight, setIsTerminationInFlight] = useState(false);
  const currentIdentityKeyRef = useRef(identityKey);
  const operationGenerationRef = useRef(0);
  const inFlightOperationRef = useRef<object | null>(null);
  currentIdentityKeyRef.current = identityKey;

  useEffect(() => {
    operationGenerationRef.current += 1;
    inFlightOperationRef.current = null;
    setIsTerminationInFlight(false);
  }, [identityKey]);

  const terminateTwap = useCallback(
    async (twapOrder: TwapOrder): Promise<void> => {
      if (inFlightOperationRef.current) {
        return;
      }

      const operationIdentityKey = identityKey;
      const operationGeneration = ++operationGenerationRef.current;
      const operationToken = {};
      inFlightOperationRef.current = operationToken;
      const isCurrentOperation = () =>
        currentIdentityKeyRef.current === operationIdentityKey &&
        operationGenerationRef.current === operationGeneration &&
        inFlightOperationRef.current === operationToken;
      setIsTerminationInFlight(true);

      try {
        const result = await Engine.context.PerpsController.cancelOrder({
          orderId: twapOrder.orderId,
          symbol: twapOrder.symbol,
          orderType: 'twap',
          providerId: twapOrder.providerId,
        });

        if (!isCurrentOperation()) {
          return;
        }

        if (!result.success) {
          throw new Error(result.error ?? 'TWAP termination failed');
        }

        // For opening schedules, name the executed exposure so the shared copy
        // does not fall through to "funds are available to trade". Reduce-only
        // schedules intentionally omit that opening-direction subtitle.
        const executedSize = Number.parseFloat(twapOrder.executedSize);
        const hasFills = Number.isFinite(executedSize) && executedSize > 0;
        showToast(
          PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            twapOrder.reduceOnly,
            undefined,
            hasFills && !twapOrder.reduceOnly
              ? twapOrder.side === 'buy'
                ? 'long'
                : 'short'
              : undefined,
            hasFills && !twapOrder.reduceOnly
              ? twapOrder.executedSize
              : undefined,
            hasFills && !twapOrder.reduceOnly ? twapOrder.symbol : undefined,
          ),
        );
        onSuccess?.(twapOrder);
      } catch (err) {
        if (!isCurrentOperation()) {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        DevLogger.log('Perps: Failed to terminate TWAP', error);
        showToast(PerpsToastOptions.orderManagement.shared.cancellationFailed);
        onError?.(error, twapOrder);
      } finally {
        if (inFlightOperationRef.current === operationToken) {
          inFlightOperationRef.current = null;
          if (currentIdentityKeyRef.current === operationIdentityKey) {
            setIsTerminationInFlight(false);
          }
        }
      }
    },
    [PerpsToastOptions, identityKey, onError, onSuccess, showToast],
  );

  return { isTerminationInFlight, terminateTwap };
};
