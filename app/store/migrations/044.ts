import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { InternalAccount } from '@metamask/keyring-api';

export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;

  if (!ensureValidState(state, 41)) {
    return state;
  }
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 41: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 41: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 41: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState.AccountsController)) {
    captureException(
      new Error(
        `Migration 41: Invalid AccountsController state: '${typeof state.engine
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
        `Migration 41: Missing internalAccounts property from AccountsController: '${typeof state
          .engine.backgroundState.AccountsController}'`,
      ),
    );
    return state;
  }

  mergeInternalAccounts(state);

  console.log(
    'Migration 41 complete with new state AccountsController',
    JSON.stringify(state.engine.backgroundState.AccountsController),
  );

  return state;
}

function mergeInternalAccounts(state: Record<string, any>) {
  const accountsController: AccountsControllerState =
    state.engine.backgroundState.AccountsController;
  const internalAccounts = accountsController.internalAccounts.accounts;
  const selectedAccount = accountsController.internalAccounts.selectedAccount;

  const mergedAccounts: Record<string, InternalAccount> = {};
  const addressMap: Record<string, string> = {};

  for (const [id, account] of Object.entries(internalAccounts)) {
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
      addressMap[lowerCaseAddress] = id;
      mergedAccounts[id] = {
        ...account,
        address: lowerCaseAddress,
      };
    }
  }

  const selectedAddress =
    internalAccounts[selectedAccount].address.toLowerCase();
  const newSelectedAccount = addressMap[selectedAddress];

  accountsController.internalAccounts.accounts = mergedAccounts;
  accountsController.internalAccounts.selectedAccount = newSelectedAccount;
}
