import { captureException } from '@sentry/react-native';
import { isObject, hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';

/**
 * Migration to reset state of TokenBalancesController
 *
 * @param state Persisted Redux state
 * @returns
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 42)) {
    return state;
  }

  const accountsControllerState = state.engine.backgroundState
    .AccountsController as AccountsControllerState;

  if (!isObject(accountsControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 42: Invalid AccountsController state error: '${JSON.stringify(
          accountsControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(accountsControllerState, 'internalAccounts') ||
    !isObject(accountsControllerState.internalAccounts)
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 42: Invalid AccountsController internalAccounts state error: '${accountsControllerState.internalAccounts}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(accountsControllerState.internalAccounts, 'accounts') ||
    !isObject(accountsControllerState.internalAccounts.accounts)
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 42: Invalid AccountsController internalAccounts accounts state error: '${accountsControllerState.internalAccounts.accounts}'`,
      ),
    );
    return state;
  }

  Object.keys(accountsControllerState.internalAccounts.accounts).forEach(
    (accountId) => {
      if (
        !accountsControllerState.internalAccounts.accounts[accountId].metadata
          .importTime
      ) {
        accountsControllerState.internalAccounts.accounts[
          accountId
        ].metadata.importTime = Date.now();
      }
    },
  );

  return state;
}
