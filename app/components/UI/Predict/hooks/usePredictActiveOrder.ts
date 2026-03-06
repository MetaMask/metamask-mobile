import { useCallback, useEffect } from 'react';
import Engine from '../../../../core/Engine';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { PredictTradeStatus } from '../constants/eventNames';
import { selectPredictActiveOrder } from '../selectors/predictController';
import { ActiveOrderState } from '../types';
import { PredictNavigationParamList } from '../types/navigation';
import { parseAnalyticsProperties } from '../utils/analytics';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { PredictControllerState } from '../controllers/PredictController';

type PredictActiveOrder = PredictControllerState['activeOrder'];

interface UsePredictActiveOrderOptions {
  shouldInit?: boolean;
}

export const usePredictActiveOrder = ({
  shouldInit = false,
}: UsePredictActiveOrderOptions = {}) => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const { PredictController } = Engine.context;

  const activeOrder = useSelector(selectPredictActiveOrder);
  const activeTransactionMeta = useTransactionMetadataRequest();

  const market = route.params?.market;
  const outcome = route.params?.outcome;
  const outcomeToken = route.params?.outcomeToken;
  const entryPoint = route.params?.entryPoint;
  const transactionId =
    route.params?.transactionId ?? activeOrder?.transactionId;
  const isPayWithAnyToken = !!activeTransactionMeta?.id || !!transactionId;

  const updateActiveOrder = useCallback(
    (order: PredictActiveOrder) => {
      if (order === null) {
        PredictController.clearActiveOrder();
        PredictController.setSelectedPaymentToken(null);
        return;
      }

      PredictController.setActiveOrder(order);
    },
    [PredictController],
  );

  useEffect(() => {
    if (!shouldInit || !market || !outcome || !outcomeToken || !entryPoint) {
      return;
    }

    if (activeOrder && isPayWithAnyToken) {
      return;
    }

    updateActiveOrder({
      state: ActiveOrderState.PREVIEW,
    });
    PredictController.setSelectedPaymentToken(null);
    PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties: parseAnalyticsProperties(
        market,
        outcomeToken,
        entryPoint,
      ),
      sharePrice: outcomeToken?.price,
    });
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activeOrder,
    updateActiveOrder,
  };
};
