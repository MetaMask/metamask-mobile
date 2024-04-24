import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 39: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 39: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 39: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState.TransactionController)) {
    captureException(
      new Error(
        `Migration 39: Invalid TransactionController state: '${state.engine.backgroundState.TransactionController}'`,
      ),
    );
    return state;
  }

  const transactionControllerState =
    state.engine.backgroundState.TransactionController;

  if (!Array.isArray(transactionControllerState.transactions)) {
    captureException(
      new Error(
        `Migration 39: Missing transactions property from TransactionController: '${typeof state
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
