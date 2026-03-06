import { RouteProp, useRoute } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import Engine from '../../../../core/Engine';
import { PredictTradeStatus } from '../constants/eventNames';
import { ActiveOrderState } from '../types';
import { PredictNavigationParamList } from '../types/navigation';
import { parseAnalyticsProperties } from '../utils/analytics';
import { usePredictActiveOrder } from './usePredictActiveOrder';

export const usePredictInitActiveOrder = () => {
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictBuyPreview'>>();
  const { PredictController } = Engine.context;

  const { updateActiveOrder, activeOrder } = usePredictActiveOrder();

  const market = route.params?.market;
  const outcomeToken = route.params?.outcomeToken;
  const entryPoint = route.params?.entryPoint;

  const initializeActiveOrder = useCallback(() => {
    updateActiveOrder({
      state: ActiveOrderState.PREVIEW,
      isInputFocused: true,
    });
    PredictController.setSelectedPaymentToken(null);
    PredictController.trackPredictOrderEvent({
      status: PredictTradeStatus.INITIATED,
      analyticsProperties: parseAnalyticsProperties(
        market,
        outcomeToken,
        entryPoint,
      ),
    });
  }, [updateActiveOrder, PredictController, market, outcomeToken, entryPoint]);

  useEffect(() => {
    if (!activeOrder) {
      initializeActiveOrder();
    }

    return () => {
      if (
        activeOrder?.state === ActiveOrderState.PREVIEW ||
        activeOrder?.state === ActiveOrderState.PLACING_ORDER
      ) {
        PredictController.clearActiveOrder();
        PredictController.setSelectedPaymentToken(null);
      }
    };
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activeOrder,
    updateActiveOrder,
  };
};
