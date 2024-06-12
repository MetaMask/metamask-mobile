import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import {
  AccountsControllerState,
  getUUIDFromAddressOfNormalAccount,
} from '@metamask/accounts-controller';
import { InternalAccount } from '@metamask/keyring-api';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 44)) {
    return state;
  }

  if (!isObject(state.engine.backgroundState.AccountsController)) {
    captureException(
      new Error(
        `Migration 44: Invalid AccountsController state: '${typeof state.engine
          .backgroundState.AccountsController}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(
      state.engine.backgroundState.AccountsController,
      'internalAccounts',
    )
  ) {
    captureException(
      new Error(
        `Migration 44: Missing internalAccounts property from AccountsController: '${typeof state
          .engine.backgroundState.AccountsController}'`,
      ),
    );
    return state;
  }
  mergeInternalAccounts(state);
  return state;
}

function mergeInternalAccounts(state: Record<string, any>) {
  const accountsController: AccountsControllerState =
    state.engine.backgroundState.AccountsController;
  const internalAccounts = accountsController.internalAccounts.accounts;
  const selectedAccount = accountsController.internalAccounts.selectedAccount;

  const selectedAddress =
    internalAccounts[selectedAccount]?.address.toLowerCase();

  const mergedAccounts: Record<string, InternalAccount> = {};
  const addressMap: Record<string, string> = {};

  for (const [, account] of Object.entries(internalAccounts)) {
    const lowerCaseAddress = account.address.toLowerCase();
    if (addressMap[lowerCaseAddress]) {
      const existingAccount = mergedAccounts[addressMap[lowerCaseAddress]];
      existingAccount.metadata = {
        ...existingAccount.metadata,
        ...account.metadata,
        name: existingAccount.metadata.name || account.metadata.name,
      };
      existingAccount.methods = Array.from(
        new Set([...existingAccount.methods, ...account.methods]),
      );
    } else {
      const newId = getUUIDFromAddressOfNormalAccount(lowerCaseAddress);
      addressMap[lowerCaseAddress] = newId;
      mergedAccounts[newId] = {
        ...account,
        address: lowerCaseAddress,
        id: newId,
      };
    }
  }

  const newSelectedAccount =
    addressMap[selectedAddress] ||
    Object.keys(mergedAccounts)[0] || // Default to the first account in the list
    selectedAccount;

  accountsController.internalAccounts.accounts = mergedAccounts;
  accountsController.internalAccounts.selectedAccount = newSelectedAccount;
}
