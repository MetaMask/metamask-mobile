import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';

/**
 * Validates AccountsController state
 *
 * @param state - AccountsController state
 * @returns - Boolean indicating if state is valid
 */
function isAccountsControllerState(
  state: unknown,
  migrationNumber: number,
): state is AccountsControllerState {
  if (!isObject(state)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid AccountsController state error: AccountsController state is not an object, type: '${typeof state}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(state, 'internalAccounts')) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid AccountsController state error: missing internalAccounts`,
      ),
    );
    return false;
  }

  if (!isObject(state.internalAccounts)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid AccountsController state error: internalAccounts is not an object, type: '${typeof state.internalAccounts}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(state.internalAccounts, 'accounts')) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid AccountsController state error: missing internalAccounts.accounts`,
      ),
    );
    return false;
  }

  if (!isObject(state.internalAccounts.accounts)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration ${migrationNumber}: Invalid AccountsController state error: internalAccounts.accounts is not an object, type: '${typeof state
          .internalAccounts.accounts}'`,
      ),
    );
    return false;
  }

  return true;
}

/**
 * Migration for ensuring that selectedAccount on the AccountsController is defined
 *
 * @param state - Persisted data store from redux persist
 * @param migrationNumber - Migration version
 * @returns - Migrated data store
 */
export const migration52 = (state: unknown, migrationNumber: number) => {
  if (!ensureValidState(state, migrationNumber)) {
    return state;
  }

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  if (!isAccountsControllerState(accountsControllerState, migrationNumber)) {
    return state;
  }

  const { accounts, selectedAccount } =
    accountsControllerState.internalAccounts;

  // Set selectedAccount by default if selectedAccount is undefined or account no longer exists for the selectedAccount
  if (
    Object.values(accounts).length > 0 &&
    (!selectedAccount || (selectedAccount && !accounts[selectedAccount]))
  ) {
    if (Object.values(accounts)[0].id === undefined) {
      captureException(
        new Error(
          `Migration 52: selectedAccount will be undefined because Object.values(accounts)[0].id is undefined: 'accounts: ${accounts}'.`,
        ),
      );
    }
    accountsControllerState.internalAccounts.selectedAccount =
      Object.values(accounts)[0].id;
  }

  return state;
};

/**
 * Migration for ensuring that selectedAccount on the AccountsController is defined
 */
export default function migrate(state: unknown) {
  return migration52(state, 52);
}
