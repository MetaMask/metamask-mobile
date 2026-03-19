import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPredictActiveOrder } from '../selectors/predictController';
import { parseAnalyticsProperties } from '../utils/analytics';
import { PredictMarket, PredictOutcomeToken } from '../types';
import { PredictEntryPoint } from '../types/navigation';

export interface InitializeActiveOrderParams {
  market: PredictMarket;
  outcomeToken: PredictOutcomeToken;
  entryPoint?: PredictEntryPoint;
}

export const usePredictActiveOrder = () => {
  const { PredictController } = Engine.context;

  const activeOrder = useSelector(selectPredictActiveOrder);

  const initializeActiveOrder = useCallback(
    (params: InitializeActiveOrderParams) => {
      PredictController.initializeOrder(
        parseAnalyticsProperties(
          params.market,
          params.outcomeToken,
          params.entryPoint,
        ),
      );
    },
    [PredictController],
  );

  const clearActiveOrder = useCallback(() => {
    PredictController.clearActiveOrder();
  }, [PredictController]);

  const clearOrderError = useCallback(() => {
    PredictController.clearOrderError();
  }, [PredictController]);

  return {
    activeOrder,
    clearActiveOrder,
    clearOrderError,
    initializeActiveOrder,
  };
};
