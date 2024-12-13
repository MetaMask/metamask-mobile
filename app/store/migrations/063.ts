import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { SmartTransactionStatuses } from '@metamask/smart-transactions-controller/dist/types';
import { TransactionStatus, CHAIN_IDS } from '@metamask/transaction-controller';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 63)) {
    return state;
  }

  if (!isObject(state.engine.backgroundState.TransactionController)) {
    captureException(
      new Error(
        `Migration 63: Invalid TransactionController state: '${state.engine.backgroundState.TransactionController}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState.SmartTransactionsController)) {
    captureException(
      new Error(
        `Migration 63: Invalid SmartTransactionsController state: '${state.engine.backgroundState.SmartTransactionsController}'`,
      ),
    );
    return state;
  }

  const transactionControllerState =
    state.engine.backgroundState.TransactionController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartTransactionsControllerState = state.engine.backgroundState.SmartTransactionsController as any;

  if (!Array.isArray(transactionControllerState.transactions)) {
    captureException(
      new Error(
        `Migration 63: Missing transactions property from TransactionController: '${typeof state
          .engine.backgroundState.TransactionController}'`,
      ),
    );
    return state;
  }
  const smartTransactions =
    smartTransactionsControllerState?.smartTransactionsState?.smartTransactions;
  if (!isObject(smartTransactions)) {
    captureException(
      new Error(
        `Migration 63: Missing smart transactions property from SmartTransactionsController: '${typeof state
          .engine.backgroundState.SmartTransactionsController?.smartTransactionsState}'`,
      ),
    );
    return state;
  }

  const ethereumMainnetSmartTransactions = smartTransactions[CHAIN_IDS.MAINNET];
  if (
    !Array.isArray(ethereumMainnetSmartTransactions) ||
    ethereumMainnetSmartTransactions.length === 0
  ) {
    // If there are no smart transactions, we can skip this migration.
    return state;
  }

  const smartTransactionTxHashesForUpdate: Record<string, boolean> = {};
  ethereumMainnetSmartTransactions.forEach((smartTransaction) => {
    if (
      smartTransaction.txHash &&
      (smartTransaction.status === SmartTransactionStatuses.CANCELLED ||
        smartTransaction.status === SmartTransactionStatuses.UNKNOWN)
    ) {
      smartTransactionTxHashesForUpdate[smartTransaction.txHash.toLowerCase()] = true;
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionControllerState.transactions.forEach((transaction: any) => {
    if (!transaction.hash || transaction.status === TransactionStatus.failed) {
      return;
    }
    const previousStatus = transaction.status;
    if (smartTransactionTxHashesForUpdate[transaction.hash.toLowerCase()]) {
      transaction.status = TransactionStatus.failed;
      transaction.error = {
        name: 'SmartTransactionCancelled',
        message: `Smart transaction cancelled. Previous status: ${previousStatus}`,
      };
    }
  });

  return state;
}
