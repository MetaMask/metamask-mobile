import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import {
  GetBalanceParams,
  GetPositionsParams,
  OrderPreview,
  PlaceOrderParams,
  PreviewOrderParams,
} from '../providers/types';
import { ClaimParams } from '../types';

export function usePredictTrading() {
  const getPositions = useCallback(async (params: GetPositionsParams) => {
    const controller = Engine.context.PredictController;
    return controller.getPositions(params);
  }, []);

  const claim = useCallback(async (claimParams: ClaimParams) => {
    const controller = Engine.context.PredictController;
    return controller.claimWithConfirmation(claimParams);
  }, []);

  const placeOrder = useCallback(async (params: PlaceOrderParams) => {
    const controller = Engine.context.PredictController;
    return controller.placeOrder(params);
  }, []);

  const previewOrder = useCallback(
    async (params: PreviewOrderParams): Promise<OrderPreview> => {
      const controller = Engine.context.PredictController;
      return controller.previewOrder(params);
    },
    [],
  );

  const getBalance = useCallback(async (params: GetBalanceParams) => {
    const controller = Engine.context.PredictController;
    return controller.getBalance(params);
  }, []);

  return {
    getPositions,
    placeOrder,
    claim,
    getBalance,
    previewOrder,
  };
}
