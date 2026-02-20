import { useCallback } from 'react';
import Engine from '../../../../core/Engine';
import {
  ClaimParams,
  GetBalanceParams,
  OrderPreview,
  PlaceOrderParams,
  PrepareDepositParams,
  PrepareWithdrawParams,
  PreviewOrderParams,
} from '../types';

export function usePredictTrading() {
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

  const prepareWithdraw = useCallback(async (params: PrepareWithdrawParams) => {
    const controller = Engine.context.PredictController;
    return controller.prepareWithdraw(params);
  }, []);

  const deposit = useCallback(async (params: PrepareDepositParams) => {
    const controller = Engine.context.PredictController;
    return controller.depositWithConfirmation(params);
  }, []);

  return {
    placeOrder,
    claim,
    getBalance,
    previewOrder,
    prepareWithdraw,
    deposit,
  };
}
