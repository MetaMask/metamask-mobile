import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectPredictActiveBuyOrder } from '../selectors/predictController';
import { ActiveOrderState, PredictMarket, PredictOutcomeToken } from '../types';
import { PredictEntryPoint } from '../types/navigation';

export interface InitializeActiveOrderParams {
  market: PredictMarket;
  outcomeToken: PredictOutcomeToken;
  entryPoint?: PredictEntryPoint;
}

export const usePredictActiveOrder = () => {
  const { PredictController } = Engine.context;

  const activeOrder = useSelector(selectPredictActiveBuyOrder);

  const clearOrderError = useCallback(() => {
    PredictController.clearOrderError();
  }, [PredictController]);

  const clearActiveOrderTransactionId = useCallback(() => {
    PredictController.clearActiveOrderTransactionId();
  }, [PredictController]);

  const currentState = useMemo(() => activeOrder?.state, [activeOrder]);

  const isDepositing = useMemo(
    () => currentState === ActiveOrderState.DEPOSITING,
    [currentState],
  );

  const isPlacingOrder = useMemo(
    () => currentState === ActiveOrderState.PLACING_ORDER || isDepositing,
    [currentState, isDepositing],
  );

  return {
    activeOrder,
    isDepositing,
    isPlacingOrder,
    clearOrderError,
    clearActiveOrderTransactionId,
  };
};
