import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import Logger from '../../util/Logger';

const migrationVersion = 92;

/**
 * Migration 92 cleans up the smart transactions state by wiping all existing smart transactions
 * for all accounts across all networks. We don't need it anymore since we don't persist new smart transactions.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const smartTransactionsControllerState =
    state.engine.backgroundState.SmartTransactionsController;

  // If SmartTransactionsController doesn't exist (fresh install), skip migration
  if (!smartTransactionsControllerState) {
    return state;
  }

  if (!isObject(smartTransactionsControllerState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid SmartTransactionsController state: '${typeof smartTransactionsControllerState}'`,
      ),
    );
    return state;
  }

  if (
    !isObject(smartTransactionsControllerState.smartTransactionsState) ||
    !isObject(
      smartTransactionsControllerState.smartTransactionsState.smartTransactions,
    )
  ) {
    return state;
  }

  // Wipe smart transactions for all chains
  // We're resetting the entire smartTransactions object to ensure complete cleanup
  smartTransactionsControllerState.smartTransactionsState.smartTransactions =
    {};

  Logger.log(
    `Migration ${migrationVersion}: Wiped all smart transactions from state`,
  );

  return state;
}
