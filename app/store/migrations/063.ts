import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { SmartTransactionStatuses, type SmartTransaction } from '@metamask/smart-transactions-controller/dist/types';
import { TransactionStatus, CHAIN_IDS } from '@metamask/transaction-controller';

const migrationVersion = 63;

interface SmartTransactionsState {
  smartTransactions: {
    [chainId: string]: SmartTransaction[];
  };
}

export default function migrate(state: unknown) {
  // eslint-disable-next-line no-console
  console.log(' ====== MIGRATION 063 started ====== ');
  if (!ensureValidState(state, migrationVersion)) {
    // eslint-disable-next-line no-console
    console.log(' ====== MIGRATION 063: Invalid state version, skipping ====== ');
    return state;
  }

  const transactionControllerState = state.engine.backgroundState.TransactionController;
  const smartTransactionsControllerState = state.engine.backgroundState.SmartTransactionsController;

  if (!isObject(transactionControllerState)) {
    // eslint-disable-next-line no-console
    console.log(' ====== MIGRATION 063: Invalid TransactionController state ====== ');
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid TransactionController state: '${transactionControllerState}'`,
      ),
    );
    return state;
  }

  if (!isObject(smartTransactionsControllerState)) {
    // eslint-disable-next-line no-console
    console.log(' ====== MIGRATION 063: Invalid SmartTransactionsController state ====== ');
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid SmartTransactionsController state: '${smartTransactionsControllerState}'`,
      ),
    );
    return state;
  }

  if (!Array.isArray(transactionControllerState.transactions)) {
    // eslint-disable-next-line no-console
    console.log(' ====== MIGRATION 063: Missing transactions array ====== ');
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing transactions property from TransactionController: '${typeof state
          .engine.backgroundState.TransactionController}'`,
      ),
    );
    return state;
  }

  const smartTransactions = (smartTransactionsControllerState?.smartTransactionsState as SmartTransactionsState)?.smartTransactions;
  if (!isObject(smartTransactions)) {
    // eslint-disable-next-line no-console
    console.log(' ====== MIGRATION 063: Missing smart transactions ====== ');
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing smart transactions property from SmartTransactionsController: '${typeof smartTransactionsControllerState?.smartTransactionsState}'`,
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
    // eslint-disable-next-line no-console
    console.log(' ====== MIGRATION 063: No smart transactions to process ====== ');
    return state;
  }

  // eslint-disable-next-line no-console
  console.log(' ====== MIGRATION 063: Processing', ethereumMainnetSmartTransactions.length, 'smart transactions ====== ');

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
          smartTransactionStatusesForUpdate.includes(smartTransaction.status as SmartTransactionStatuses),
      )
      .map((smartTransaction) => smartTransaction.txHash?.toLowerCase()),
  );

  // eslint-disable-next-line no-console
  console.log(' ====== MIGRATION 063: Found', smartTransactionTxHashesForUpdate.size, 'transactions to update ====== ');

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

  // eslint-disable-next-line no-console
  console.log(' ====== MIGRATION 063 completed successfully ====== ');
  return state;
}
