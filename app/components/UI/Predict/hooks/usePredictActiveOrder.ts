import { useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { PredictControllerState } from '../controllers/PredictController';
import { selectPredictActiveOrder } from '../selectors/predictController';
import { parseAnalyticsProperties } from '../utils/analytics';
import { PredictTradeStatus } from '../constants/eventNames';
import { ActiveOrderState, PredictMarket, PredictOutcomeToken } from '../types';
import { PredictEntryPoint } from '../types/navigation';

type PredictActiveOrder = PredictControllerState['activeOrder'];
type PredictActiveOrderValue = NonNullable<PredictActiveOrder>;
type PredictActiveOrderPatch =
  | {
      [K in keyof PredictActiveOrderValue]?: PredictActiveOrderValue[K] | null;
    }
  | null;

export interface InitializeActiveOrderParams {
  market: PredictMarket;
  outcomeToken: PredictOutcomeToken;
  entryPoint?: PredictEntryPoint;
}

export const usePredictActiveOrder = () => {
  const { PredictController } = Engine.context;

  const activeOrder = useSelector(selectPredictActiveOrder);

  const activeOrderRef = useRef(activeOrder);
  activeOrderRef.current = activeOrder;

  const updateActiveOrder = useCallback(
    (order: PredictActiveOrderPatch) => {
      if (order === null) {
        PredictController.clearActiveOrder();
        PredictController.setSelectedPaymentToken(null);
        return;
      }

      const nextOrder: Partial<PredictActiveOrderValue> = {
        ...(activeOrderRef.current ?? {}),
      };

      if ('amount' in order) {
        if (order.amount === null) {
          delete nextOrder.amount;
        } else {
          nextOrder.amount = order.amount;
        }
      }

      if ('transactionId' in order) {
        if (order.transactionId === null) {
          delete nextOrder.transactionId;
        } else {
          nextOrder.transactionId = order.transactionId;
        }
      }

      if ('isInputFocused' in order) {
        if (order.isInputFocused === null) {
          delete nextOrder.isInputFocused;
        } else {
          nextOrder.isInputFocused = order.isInputFocused;
        }
      }

      if ('state' in order) {
        if (order.state === null) {
          delete nextOrder.state;
        } else {
          nextOrder.state = order.state;
        }
      }

      if ('error' in order) {
        if (order.error === null) {
          delete nextOrder.error;
        } else {
          nextOrder.error = order.error;
        }
      }

      PredictController.setActiveOrder(
        nextOrder.state ? (nextOrder as PredictActiveOrderValue) : null,
      );
    },
    [PredictController],
  );

  const initializeActiveOrder = useCallback(
    (params: InitializeActiveOrderParams) => {
      updateActiveOrder({
        state: ActiveOrderState.PREVIEW,
        isInputFocused: true,
      });
      PredictController.setSelectedPaymentToken(null);
      PredictController.trackPredictOrderEvent({
        status: PredictTradeStatus.INITIATED,
        analyticsProperties: parseAnalyticsProperties(
          params.market,
          params.outcomeToken,
          params.entryPoint,
        ),
      });
    },
    [updateActiveOrder, PredictController],
  );

  const clearActiveOrder = useCallback(() => {
    PredictController.clearActiveOrder();
  }, [PredictController]);

  return {
    activeOrder,
    updateActiveOrder,
    clearActiveOrder,
    initializeActiveOrder,
  };
};
