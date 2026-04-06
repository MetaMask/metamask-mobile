import type { TransactionMonitorPort } from '../ports';

interface PredictTransactionEvent {
  type: string;
  status: string;
  transactionId?: string;
  senderAddress?: string;
}

interface PredictControllerMessenger {
  subscribe(
    event: 'PredictController:transactionStatusChanged',
    handler: (event: PredictTransactionEvent) => void,
  ): void;
  unsubscribe(
    event: 'PredictController:transactionStatusChanged',
    handler: (event: PredictTransactionEvent) => void,
  ): void;
}

export function createTransactionMonitorAdapter(
  messenger: PredictControllerMessenger,
): TransactionMonitorPort {
  return {
    onDepositStatusChange(callback) {
      const handler = (event: PredictTransactionEvent) => {
        if (event.type !== 'depositAndOrder') {
          return;
        }

        const transactionId = event.transactionId ?? '';

        if (event.status === 'confirmed') {
          callback({ status: 'confirmed', transactionId });
        } else if (event.status === 'failed') {
          callback({
            status: 'failed',
            transactionId,
            error: 'Deposit failed',
          });
        } else if (event.status === 'rejected') {
          callback({ status: 'rejected', transactionId });
        }
      };

      messenger.subscribe(
        'PredictController:transactionStatusChanged',
        handler,
      );

      return () => {
        messenger.unsubscribe(
          'PredictController:transactionStatusChanged',
          handler,
        );
      };
    },
  };
}
