import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';

/**
 * Migration to update the selectedAccount in AccountsController if it's invalid
 * This migration is needed due to the update of Accounts Controller
 * @param state Persisted Redux state
 * @returns Valid persisted Redux state
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

  const typedAccountsControllerState =
    accountsControllerState as AccountsControllerState;
  const { accounts, selectedAccount } =
    typedAccountsControllerState.internalAccounts;

  if (Object.values(accounts).length > 0 && !accounts[selectedAccount]) {
    typedAccountsControllerState.internalAccounts.selectedAccount =
      Object.values(accounts)[0].id;
  }

  return state;
}
