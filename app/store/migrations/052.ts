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
        `FATAL ERROR: Migration 52: Invalid AccountsController state error: AccountsController state is not an object, type: '${typeof state}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(state, 'internalAccounts')) {
    captureException(
      new Error(
        'FATAL ERROR: Migration 52: Invalid AccountsController state error: missing internalAccounts',
      ),
    );
    return false;
  }

  if (!isObject(state.internalAccounts)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 52: Invalid AccountsController state error: internalAccounts is not an object, type: '${typeof state.internalAccounts}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(state.internalAccounts, 'accounts')) {
    captureException(
      new Error(
        'FATAL ERROR: Migration 52: Invalid AccountsController state error: missing internalAccounts.accounts',
      ),
    );
    return false;
  }

  if (!isObject(state.internalAccounts.accounts)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 52: Invalid AccountsController state error: internalAccounts.accounts is not an object, type: '${typeof state
          .internalAccounts.accounts}'`,
      ),
    );
    return false;
  }

  if (!hasProperty(state.internalAccounts, 'selectedAccount')) {
    captureException(
      new Error(
        'FATAL ERROR: Migration 52: Invalid AccountsController state error: missing internalAccounts.selectedAccount',
      ),
    );
    return false;
  }

  if (typeof state.internalAccounts.selectedAccount !== 'string') {
    captureException(
      new Error(
        `FATAL ERROR: Migration 52: Invalid AccountsController state error: internalAccounts.selectedAccount is not a string, type: '${typeof state
          .internalAccounts.selectedAccount}'`,
      ),
    );
    return false;
  }

  return true;
}

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 52)) {
    return state;
  }

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  if (!isAccountsControllerState(accountsControllerState)) {
    return state;
  }

  const { accounts, selectedAccount } =
    accountsControllerState.internalAccounts;

  if (Object.values(accounts).length > 0 && !accounts[selectedAccount]) {
    accountsControllerState.internalAccounts.selectedAccount =
      Object.values(accounts)[0].id;
  }

  return state;
}
