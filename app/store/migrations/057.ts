import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';

function isAccountsControllerState(
  state: unknown,
): state is AccountsControllerState {
  if (!isObject(state)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 57: Invalid AccountsController state error: AccountsController state is not an object, type: '${typeof state}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(state, 'internalAccounts')) {
    captureException(
      new Error(
        'FATAL ERROR: Migration 57: Invalid AccountsController state error: missing internalAccounts',
      ),
    );
    return false;
  }

  if (!isObject(state.internalAccounts)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 57: Invalid AccountsController state error: internalAccounts is not an object, type: '${typeof state.internalAccounts}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(state.internalAccounts, 'accounts')) {
    captureException(
      new Error(
        'FATAL ERROR: Migration 57: Invalid AccountsController state error: missing internalAccounts.accounts',
      ),
    );
    return false;
  }

  if (!isObject(state.internalAccounts.accounts)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 57: Invalid AccountsController state error: internalAccounts.accounts is not an object, type: '${typeof state
          .internalAccounts.accounts}'`,
      ),
    );
    return false;
  }

  return true;
}

/**
 * Migration for ensuring that selectedAccount on the AccountsController is defined
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 57)) {
    return state;
  }

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  if (!isAccountsControllerState(accountsControllerState)) {
    return state;
  }

  const { accounts, selectedAccount } =
    accountsControllerState.internalAccounts;

  if (
    Object.values(accounts).length > 0 &&
    (!selectedAccount || (selectedAccount && !accounts[selectedAccount]))
  ) {
    accountsControllerState.internalAccounts.selectedAccount =
      Object.values(accounts)[0].id;
  }

  return state;
}
