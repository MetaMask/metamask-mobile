import { useCallback, useEffect, useRef, useState } from 'react';
import { PERPS_CONSTANTS, type TwapOrder } from '@metamask/perps-controller';
import { useSelector } from 'react-redux';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { TraceName } from '../../../../util/trace';
import {
  PERPS_CUF_END_REASON,
  PERPS_CUF_STREAM_TIMEOUT_MS,
  PERPS_CUF_TAG,
} from '../constants/perpsCufTags';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import usePerpsToasts from './usePerpsToasts';
import {
  acceptPerpsCufRequest,
  endPerpsCufRequestAfter,
  endPerpsCufTrace,
  startPerpsCufTrace,
  watchPerpsCufTwapTerminal,
} from '../utils/perpsCufTrace';

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
  const pendingCufOpIdsRef = useRef(new Set<string>());
  currentIdentityKeyRef.current = identityKey;

  useEffect(() => {
    const pendingCufOpIds = pendingCufOpIdsRef.current;
    operationGenerationRef.current += 1;
    inFlightOperationRef.current = null;
    setIsTerminationInFlight(false);

    return () => {
      operationGenerationRef.current += 1;
      inFlightOperationRef.current = null;
      for (const opId of pendingCufOpIds) {
        endPerpsCufTrace({
          id: opId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.DISCONNECTED,
          },
        });
      }
      pendingCufOpIds.clear();
    };
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
      const cancellationCufOpId = startPerpsCufTrace({
        name: TraceName.PerpsTerminateTwapToConfirmation,
        tags: {
          [PERPS_CUF_TAG.ORDER_TYPE]: 'twap',
        },
      });
      pendingCufOpIdsRef.current.add(cancellationCufOpId);
      watchPerpsCufTwapTerminal(
        cancellationCufOpId,
        twapOrder.orderId,
        twapOrder.providerId,
      );
      let controllerSettled = false;
      endPerpsCufRequestAfter(
        cancellationCufOpId,
        () => controllerSettled,
        PERPS_CUF_STREAM_TIMEOUT_MS,
      );

      try {
        const result = await Engine.context.PerpsController.cancelOrder({
          orderId: twapOrder.orderId,
          symbol: twapOrder.symbol,
          orderType: 'twap',
          providerId: twapOrder.providerId,
        });
        controllerSettled = true;

        if (!isCurrentOperation()) {
          return;
        }

        if (!result.success) {
          endPerpsCufTrace({
            id: cancellationCufOpId,
            data: {
              [PERPS_CUF_TAG.SUCCESS]: false,
              [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.REQUEST_FAILED,
            },
          });
          pendingCufOpIdsRef.current.delete(cancellationCufOpId);
          throw new Error(result.error ?? 'TWAP termination failed');
        }

        acceptPerpsCufRequest(cancellationCufOpId);

        // For opening schedules, name the executed exposure so the shared copy
        // does not fall through to "funds are available to trade". Reduce-only
        // schedules intentionally omit that opening-direction subtitle.
        const executedSize = Number.parseFloat(twapOrder.executedSize);
        const hasFills = Number.isFinite(executedSize) && executedSize > 0;
        showToast(
          PerpsToastOptions.orderManagement.shared.cancellationSuccess(
            twapOrder.reduceOnly,
            'TWAP',
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
        controllerSettled = true;
        if (!isCurrentOperation()) {
          return;
        }
        const error = err instanceof Error ? err : new Error(String(err));
        endPerpsCufTrace({
          id: cancellationCufOpId,
          data: {
            [PERPS_CUF_TAG.SUCCESS]: false,
            [PERPS_CUF_TAG.REASON]: PERPS_CUF_END_REASON.EXCEPTION,
          },
        });
        pendingCufOpIdsRef.current.delete(cancellationCufOpId);
        DevLogger.log('Perps: Failed to terminate TWAP', error);
        Logger.error(
          ensureError(error, 'usePerpsTerminateTwap.terminateTwap'),
          {
            tags: {
              feature: PERPS_CONSTANTS.FeatureName,
              component: 'usePerpsTerminateTwap',
              action: 'terminate_twap',
              operation: 'order_management',
              provider: twapOrder.providerId ?? provider,
              network,
            },
            context: {
              name: 'usePerpsTerminateTwap.terminateTwap',
              data: {
                orderId: twapOrder.orderId,
                symbol: twapOrder.symbol,
                provider: twapOrder.providerId ?? provider,
                network,
              },
            },
          },
        );
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
    [
      PerpsToastOptions,
      identityKey,
      network,
      onError,
      onSuccess,
      provider,
      showToast,
    ],
  );

  return { isTerminationInFlight, terminateTwap };
};
