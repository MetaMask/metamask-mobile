import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { PredictTradeStatus } from '../constants/eventNames';
import { ActiveOrderState, PredictMarket, PredictOutcomeToken } from '../types';
import { PredictEntryPoint } from '../types/navigation';
import { parseAnalyticsProperties } from '../utils/analytics';
import { usePredictActiveOrder } from './usePredictActiveOrder';

export interface InitializeActiveOrderParams {
  market: PredictMarket;
  outcomeToken: PredictOutcomeToken;
  entryPoint?: PredictEntryPoint;
}

export const usePredictInitActiveOrder = () => {
  const { PredictController } = Engine.context;
  const { updateActiveOrder, activeOrder } = usePredictActiveOrder();

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

  return {
    activeOrder,
    updateActiveOrder,
    initializeActiveOrder,
  };
};
