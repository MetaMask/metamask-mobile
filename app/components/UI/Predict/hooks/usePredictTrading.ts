import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import { BuyOrderParams } from '../types';

export function usePredictTrading() {
  const getPositions = useCallback(async () => {
    const controller = Engine.context.PredictController;
    return controller.getPositions();
  }, []);

  const buy = useCallback(
    async ({ orderParams }: { orderParams: BuyOrderParams }) => {
      const controller = Engine.context.PredictController;
      return controller.buy(orderParams);
    },
    [],
  );

  return {
    getPositions,
    buy,
  };
}
