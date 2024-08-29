import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';

/**
 * Migration to update the selectedAccount in AccountsController if it's undefined.
 *
 * This migration is necessary due to an update in the AccountsController that now checks
 * if the selectedAccount is undefined and recovers from this state. The migration ensures
 * that any existing undefined selectedAccount values are updated to a valid account.
 *
 * If there are accounts present and the current selectedAccount is undefined, it will be
 * set to the ID of the first available account.
 *
 * @param state - The persisted Redux state
 * @returns The updated Redux state with a valid selectedAccount
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 51)) {
    return state;
  }

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  if (!isObject(accountsControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 51: Invalid AccountsController state error: '${typeof accountsControllerState}'`,
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
        `FATAL ERROR: Migration 51: Invalid AccountsController internalAccounts state error: '${typeof accountsControllerState.internalAccounts}'`,
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
        `FATAL ERROR: Migration 51: Invalid AccountsController internalAccounts accounts state error: '${typeof accountsControllerState
          .internalAccounts.accounts}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(accountsControllerState.internalAccounts, 'selectedAccount') ||
    typeof accountsControllerState.internalAccounts.selectedAccount !== 'string'
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 51: Invalid AccountsController internalAccounts selectedAccount state error: '${typeof accountsControllerState
          .internalAccounts.selectedAccount}'`,
      ),
    );
    return state;
  }

  const { accounts, selectedAccount } = (
    accountsControllerState as AccountsControllerState
  ).internalAccounts;

  if (Object.values(accounts).length > 0 && !accounts[selectedAccount]) {
    accountsControllerState.internalAccounts.selectedAccount =
      Object.values(accounts)[0].id;
  }

  return state;
}
