import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { BuyParams, GetPositionsParams, SellParams } from '../types';

export function usePredictTrading() {
  const getPositions = useCallback(async (params: GetPositionsParams) => {
    const controller = Engine.context.PredictController;
    return controller.getPositions(params);
  }, []);

  const buy = useCallback(async (orderParams: BuyParams) => {
    const controller = Engine.context.PredictController;
    return controller.buy(orderParams);
  }, []);

  const sell = useCallback(async (orderParams: SellParams) => {
    const controller = Engine.context.PredictController;
    return controller.sell(orderParams);
  }, []);

  return {
    getPositions,
    buy,
    sell,
  };
}
