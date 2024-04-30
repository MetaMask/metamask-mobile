import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 40)) {
    return state;
  }

  if (!isObject(state.engine.backgroundState.TransactionController)) {
    captureException(
      new Error(
        `Migration 40: Invalid TransactionController state: '${state.engine.backgroundState.TransactionController}'`,
      ),
    );
    return state;
  }

  const transactionControllerState =
    state.engine.backgroundState.TransactionController;

  if (!Array.isArray(transactionControllerState.transactions)) {
    captureException(
      new Error(
        `Migration 40: Missing transactions property from TransactionController: '${typeof state
          .engine.backgroundState.TransactionController}'`,
      ),
    );
    return state;
  }
  transactionControllerState.transactions.forEach((transaction: any) => {
    if (transaction.rawTransaction) {
      transaction.rawTx = transaction.rawTransaction;
      delete transaction.rawTransaction;
    }
    if (transaction.transactionHash) {
      transaction.hash = transaction.transactionHash;
      delete transaction.transactionHash;
    }
    if (transaction.transaction) {
      transaction.txParams = transaction.transaction;
      delete transaction.transaction;
    }
  });

  return state;
}
