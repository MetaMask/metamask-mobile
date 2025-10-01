import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import {
  CalculateBetAmountsParams,
  CalculateCashOutAmountsParams,
  GetPositionsParams,
  PlaceOrderParams,
} from '../providers/types';
import { ClaimParams } from '../types';

export function usePredictTrading() {
  const getPositions = useCallback(async (params: GetPositionsParams) => {
    const controller = Engine.context.PredictController;
    return controller.getPositions(params);
  }, []);

  const claim = useCallback(async (claimParams: ClaimParams) => {
    const controller = Engine.context.PredictController;
    return controller.claim(claimParams);
  }, []);

  const placeOrder = useCallback(async (params: PlaceOrderParams) => {
    const controller = Engine.context.PredictController;
    return controller.placeOrder(params);
  }, []);

  const calculateBetAmounts = useCallback(
    async (params: CalculateBetAmountsParams) => {
      const controller = Engine.context.PredictController;
      return controller.calculateBetAmounts(params);
    },
    [],
  );

  const calculateCashOutAmounts = useCallback(
    async (params: CalculateCashOutAmountsParams) => {
      const controller = Engine.context.PredictController;
      return controller.calculateCashOutAmounts(params);
    },
    [],
  );

  return {
    getPositions,
    placeOrder,
    claim,
    calculateBetAmounts,
    calculateCashOutAmounts,
  };
}
