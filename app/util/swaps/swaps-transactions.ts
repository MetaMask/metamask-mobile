import Engine from '../../core/Engine';
import Logger from '../Logger';

const LOG_PREFIX = 'Swaps Transactions';

export function addSwapsTransaction(
  transactionId: string,
  data: Record<string, any>,
) {
  const { TransactionController } = Engine.context;

  (TransactionController as any).update((state: any) => {
    if (!state.swapsTransactions) {
      state.swapsTransactions = {};
    }

    state.swapsTransactions[transactionId] = data;
  });

  Logger.log(LOG_PREFIX, 'Added transaction', transactionId);
}

export function updateSwapsTransaction(
  transactionId: string,
  callback: (transaction: Record<string, any>) => void,
) {
  const { TransactionController } = Engine.context;

  (TransactionController as any).update((state: any) => {
    const existingData = state.swapsTransactions[transactionId];

    if (!existingData) {
      throw new Error(`Swaps transaction not found - ${transactionId}`);
    }

    callback(existingData);
  });

  Logger.log(LOG_PREFIX, 'Updated transaction', transactionId);
}
