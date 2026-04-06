import type { Result } from '../../../../types';
import type { OrderExecutionPort } from '../ports';

interface OrderExecutionContext {
  placeOrder: () => Promise<Result>;
  initPayWithAnyToken: () => Promise<Result<{ batchId: string }>>;
}

export function createOrderExecutionAdapter(
  ctx: OrderExecutionContext,
): OrderExecutionPort {
  return {
    placeOrder: async () => {
      const result = await ctx.placeOrder();
      const response = result.response as unknown as
        | { spentAmount: string; receivedAmount: string }
        | undefined;

      return {
        ...result,
        response: response ?? { spentAmount: '0', receivedAmount: '0' },
      } as Result<{ spentAmount: string; receivedAmount: string }>;
    },

    initPayWithAnyToken: () => ctx.initPayWithAnyToken(),
  };
}
