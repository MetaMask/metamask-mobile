import type { OrderExecutionPort } from '../ports';
import type { Result } from '../../../../types';

export interface TestOrderExecutionAdapter extends OrderExecutionPort {
  placeOrderResult: Result<{ spentAmount: string; receivedAmount: string }>;
  initPayWithAnyTokenResult: Result<{ batchId: string }>;
  placeOrderCallCount: number;
  initPayWithAnyTokenCallCount: number;
}

export function createTestOrderExecutionAdapter(
  overrides?: Partial<
    Pick<
      TestOrderExecutionAdapter,
      'placeOrderResult' | 'initPayWithAnyTokenResult'
    >
  >,
): TestOrderExecutionAdapter {
  return {
    placeOrderResult: overrides?.placeOrderResult ?? {
      success: true,
      response: { spentAmount: '10.00', receivedAmount: '20.00' },
    },
    initPayWithAnyTokenResult: overrides?.initPayWithAnyTokenResult ?? {
      success: true,
      response: { batchId: 'batch-1' },
    },
    placeOrderCallCount: 0,
    initPayWithAnyTokenCallCount: 0,

    async placeOrder() {
      this.placeOrderCallCount++;
      return this.placeOrderResult;
    },

    async initPayWithAnyToken() {
      this.initPayWithAnyTokenCallCount++;
      return this.initPayWithAnyTokenResult;
    },
  };
}
