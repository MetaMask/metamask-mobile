import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import {
  SmartTransactionStatuses,
  type SmartTransaction,
} from '@metamask/smart-transactions-controller';
import { TransactionStatus, CHAIN_IDS } from '@metamask/transaction-controller';

const migrationVersion = 63;

interface SmartTransactionsState {
  smartTransactions: {
    [chainId: string]: SmartTransaction[];
  };
}

interface SmartTransactionsControllerState {
  smartTransactionsState: SmartTransactionsState;
}

export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const transactionControllerState =
    state.engine.backgroundState.TransactionController;
  const smartTransactionsControllerState =
    state.engine.backgroundState.SmartTransactionsController;

  if (!isObject(transactionControllerState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid TransactionController state: '${transactionControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !isObject(smartTransactionsControllerState) &&
    !smartTransactionsControllerState
  ) {
    // This is a fresh install, so we can skip this migration.
    return state;
  }

  if (!Array.isArray(transactionControllerState.transactions)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing transactions property from TransactionController: '${typeof state
          .engine.backgroundState.TransactionController}'`,
      ),
    );
    return state;
  }

  const smartTransactions = (
    smartTransactionsControllerState as SmartTransactionsControllerState
  )?.smartTransactionsState?.smartTransactions;
  if (!isObject(smartTransactions)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing smart transactions property from SmartTransactionsController: '${typeof (
          smartTransactionsControllerState as SmartTransactionsControllerState
        )?.smartTransactionsState}'`,
      ),
    );
    return state;
  }

  const ethereumMainnetSmartTransactions = smartTransactions[CHAIN_IDS.MAINNET];

  // If there are no smart transactions, we can skip this migration.
  if (
    !Array.isArray(ethereumMainnetSmartTransactions) ||
    ethereumMainnetSmartTransactions.length === 0
  ) {
    return state;
  }

  const smartTransactionStatusesForUpdate: SmartTransactionStatuses[] = [
    SmartTransactionStatuses.CANCELLED,
    SmartTransactionStatuses.UNKNOWN,
    SmartTransactionStatuses.RESOLVED,
  ];

  // Create a Set of transaction hashes for quick lookup.
  const smartTransactionTxHashesForUpdate = new Set(
    ethereumMainnetSmartTransactions
      .filter(
        (smartTransaction) =>
          smartTransaction.txHash &&
          smartTransaction.status &&
          smartTransactionStatusesForUpdate.includes(
            smartTransaction.status as SmartTransactionStatuses,
          ),
      )
      .map((smartTransaction) => smartTransaction.txHash?.toLowerCase()),
  );

  // Update transactions based on the Set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionControllerState.transactions.forEach((transaction: any) => {
    if (!transaction.hash || transaction.status === TransactionStatus.failed) {
      return;
    }
    const previousStatus = transaction.status;
    if (smartTransactionTxHashesForUpdate.has(transaction.hash.toLowerCase())) {
      transaction.status = TransactionStatus.failed;
      transaction.error = {
        name: 'SmartTransactionCancelled',
        message: `Smart transaction cancelled. Previous status: ${previousStatus}`,
      };
    }
  });

  return state;
}
