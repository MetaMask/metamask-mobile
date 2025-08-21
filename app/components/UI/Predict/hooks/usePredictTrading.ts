import { useCallback } from 'react';
import Engine from '../../../../core/Engine';

export function usePredictTrading() {
  const getPositions = useCallback(async () => {
    const controller = Engine.context.PredictController;
    return controller.getPositions();
  }, []);

  return {
    getPositions,
  };
}
