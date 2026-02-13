import { useCallback, useEffect, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { PlaceOrderParams, OrderPreview } from '../providers/types';
import { usePredictTrading } from './usePredictTrading';
import { PaymentToken } from './usePredictPaymentToken';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { ensureError } from '../utils/predictErrorHandler';
import { PREDICT_CONSTANTS, PREDICT_ERROR_CODES } from '../constants/errors';

export type DepositAndOrderState =
  | 'idle'
  | 'depositing'
  | 'placing_order'
  | 'success'
  | 'deposit_failed'
  | 'order_failed';

interface UsePredictDepositAndOrderReturn {
  state: DepositAndOrderState;
  error: string | null;
  placeBet: (params: {
    providerId: string;
    preview: OrderPreview;
    selectedToken: PaymentToken;
    analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  }) => Promise<void>;
  reset: () => void;
}

export function usePredictDepositAndOrder(): UsePredictDepositAndOrderReturn {
  const { placeOrder: controllerPlaceOrder } = usePredictTrading();
  const [state, setState] = useState<DepositAndOrderState>('idle');
  const [error, setError] = useState<string | null>(null);

  const pendingOrderRef = useRef<{
    providerId: string;
    preview: OrderPreview;
    analyticsProperties?: PlaceOrderParams['analyticsProperties'];
  } | null>(null);

  const batchIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    pendingOrderRef.current = null;
    batchIdRef.current = null;
  }, []);

  const fireOrder = useCallback(async () => {
    const orderParams = pendingOrderRef.current;
    if (!orderParams) {
      DevLogger.log('usePredictDepositAndOrder: No pending order params');
      return;
    }

    setState('placing_order');

    try {
      const result = await controllerPlaceOrder({
        providerId: orderParams.providerId,
        preview: orderParams.preview,
        analyticsProperties: orderParams.analyticsProperties,
      });

      if (result?.success) {
        setState('success');
      } else {
        setState('order_failed');
        setError('Order placement failed');
      }
    } catch (err) {
      setState('order_failed');
      const errorMessage =
        err instanceof Error ? err.message : 'Order placement failed';
      setError(errorMessage);
      Logger.error(ensureError(err), {
        tags: {
          feature: PREDICT_CONSTANTS.FEATURE_NAME,
          component: 'usePredictDepositAndOrder',
        },
        context: {
          name: 'usePredictDepositAndOrder',
          data: { method: 'fireOrder', operation: 'place_order' },
        },
      });
    }
  }, [controllerPlaceOrder]);

  useEffect(() => {
    if (state !== 'depositing') {
      return;
    }

    const handler = ({
      type,
      status,
    }: {
      type: string;
      status: string;
      senderAddress: string;
      transactionId?: string;
    }) => {
      if (type !== 'deposit') return;

      DevLogger.log('usePredictDepositAndOrder: tx status changed', {
        type,
        status,
      });

      if (status === 'confirmed') {
        fireOrder();
      } else if (status === 'failed' || status === 'rejected') {
        setState('deposit_failed');
        setError('Deposit transaction failed');
        batchIdRef.current = null;
      }
    };

    const messenger = Engine.controllerMessenger;
    messenger.subscribe('PredictController:transactionStatusChanged', handler);

    return () => {
      messenger.unsubscribe(
        'PredictController:transactionStatusChanged',
        handler,
      );
    };
  }, [state, fireOrder]);

  const placeBet = useCallback(
    async (params: {
      providerId: string;
      preview: OrderPreview;
      selectedToken: PaymentToken;
      analyticsProperties?: PlaceOrderParams['analyticsProperties'];
    }) => {
      const { providerId, preview, selectedToken, analyticsProperties } =
        params;

      if (selectedToken.isPredictBalance) {
        setState('placing_order');
        setError(null);

        try {
          const result = await controllerPlaceOrder({
            providerId,
            preview,
            analyticsProperties,
          });
          if (result?.success) {
            setState('success');
          } else {
            setState('order_failed');
            setError('Order placement failed');
          }
        } catch (err) {
          setState('order_failed');
          const errorMessage =
            err instanceof Error ? err.message : 'Order placement failed';
          setError(errorMessage);
        }
        return;
      }

      pendingOrderRef.current = {
        providerId,
        preview,
        analyticsProperties,
      };

      setState('depositing');
      setError(null);

      try {
        const controller = Engine.context.PredictController;
        const depositResult = await controller.depositForOrder({
          providerId,
          amount: String(preview.maxAmountSpent),
        });

        if (depositResult?.success && depositResult.response?.batchId) {
          batchIdRef.current = depositResult.response.batchId;
          DevLogger.log('usePredictDepositAndOrder: deposit submitted', {
            batchId: depositResult.response.batchId,
          });
        } else {
          setState('deposit_failed');
          setError('Failed to submit deposit');
        }
      } catch (err) {
        setState('deposit_failed');
        const errorMessage =
          err instanceof Error
            ? err.message
            : PREDICT_ERROR_CODES.DEPOSIT_FAILED;
        setError(errorMessage);
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictDepositAndOrder',
          },
          context: {
            name: 'usePredictDepositAndOrder',
            data: {
              method: 'placeBet',
              operation: 'deposit_for_order',
              providerId,
            },
          },
        });
      }
    },
    [controllerPlaceOrder],
  );

  return {
    state,
    error,
    placeBet,
    reset,
  };
}
