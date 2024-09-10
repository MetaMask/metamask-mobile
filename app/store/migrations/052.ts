import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';

function isAccountsControllerState(
  state: unknown,
): state is AccountsControllerState {
  return (
    isObject(state) &&
    hasProperty(state, 'internalAccounts') &&
    isObject(state.internalAccounts) &&
    hasProperty(state.internalAccounts, 'accounts') &&
    isObject(state.internalAccounts.accounts) &&
    hasProperty(state.internalAccounts, 'selectedAccount') &&
    typeof state.internalAccounts.selectedAccount === 'string'
  );
}

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 52)) {
    return state;
  }

  if (!isObject(state.engine.backgroundState.AccountsController)) {
    captureException(
      new Error('FATAL ERROR: Migration 52: Invalid AccountsController state'),
    );
    return state;
  }

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  if (!isAccountsControllerState(accountsControllerState)) {
    captureException(
      new Error('FATAL ERROR: Migration 52: Invalid AccountsController state'),
    );
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
