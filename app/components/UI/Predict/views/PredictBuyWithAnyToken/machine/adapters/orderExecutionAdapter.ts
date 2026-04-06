import type { PlaceOrderParams, Result } from '../../../../types';
import type { OrderExecutionPort } from '../ports';

interface PredictTradingHook {
  placeOrder: (params: PlaceOrderParams) => Promise<Result>;
  initPayWithAnyToken: () => Promise<Result<{ batchId: string }>>;
}

export function createOrderExecutionAdapter(
  trading: PredictTradingHook,
): OrderExecutionPort {
  return {
    placeOrder: async (params) => {
      const result = await trading.placeOrder(params);
      const response = result.response as
        | { spentAmount: string; receivedAmount: string }
        | undefined;

      return {
        ...result,
        response: response ?? { spentAmount: '0', receivedAmount: '0' },
      } as Result<{ spentAmount: string; receivedAmount: string }>;
    },

    initPayWithAnyToken: () => trading.initPayWithAnyToken(),
  };
}
