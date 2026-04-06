import type { TransactionMonitorPort } from '../ports';

export interface TestTransactionMonitorAdapter extends TransactionMonitorPort {
  simulateConfirmed: (transactionId: string) => void;
  simulateFailed: (transactionId: string, error: string) => void;
  simulateRejected: (transactionId: string) => void;
}

export function createTestTransactionMonitorAdapter(): TestTransactionMonitorAdapter {
  type DepositEvent =
    | { status: 'confirmed'; transactionId: string }
    | { status: 'failed'; transactionId: string; error: string }
    | { status: 'rejected'; transactionId: string };

  let cb: ((event: DepositEvent) => void) | null = null;

  return {
    onDepositStatusChange(callback) {
      cb = callback;
      return () => {
        cb = null;
      };
    },

    simulateConfirmed(transactionId) {
      cb?.({ status: 'confirmed', transactionId });
    },

    simulateFailed(transactionId, error) {
      cb?.({ status: 'failed', transactionId, error });
    },

    simulateRejected(transactionId) {
      cb?.({ status: 'rejected', transactionId });
    },
  };
}
