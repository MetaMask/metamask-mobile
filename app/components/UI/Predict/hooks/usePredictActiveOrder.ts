import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { PredictControllerState } from '../controllers/PredictController';
import { selectPredictActiveOrder } from '../selectors/predictController';

type PredictActiveOrder = PredictControllerState['activeOrder'];
type PredictActiveOrderValue = NonNullable<PredictActiveOrder>;
type PredictActiveOrderPatch =
  | {
      [K in keyof PredictActiveOrderValue]?: PredictActiveOrderValue[K] | null;
    }
  | null;

export const usePredictActiveOrder = () => {
  const { PredictController } = Engine.context;

  const activeOrder = useSelector(selectPredictActiveOrder);

  const updateActiveOrder = useCallback(
    (order: PredictActiveOrderPatch) => {
      if (order === null) {
        PredictController.clearActiveOrder();
        PredictController.setSelectedPaymentToken(null);
        return;
      }

      const nextOrder: Partial<PredictActiveOrderValue> = {
        ...(activeOrder ?? {}),
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

      PredictController.setActiveOrder(
        nextOrder.state ? (nextOrder as PredictActiveOrderValue) : null,
      );
    },
    [PredictController, activeOrder],
  );

  return {
    activeOrder,
    updateActiveOrder,
  };
};
