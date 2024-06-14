import { captureException } from '@sentry/react-native';
import { isObject, hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { PreferencesState } from '@metamask/preferences-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';

/**
 * Migration to add importTime property to accounts metadata of accounts controller
 * This migration is needed due to the update of Accounts Controller to version 14
 * @param state Persisted Redux state
 * @returns Valid persisted Redux state
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 46)) {
    return state;
  }

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  if (!isObject(accountsControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: Invalid AccountsController state error: '${JSON.stringify(
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
        `FATAL ERROR: Migration 46: Invalid AccountsController internalAccounts state error: '${accountsControllerState.internalAccounts}'`,
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
        `FATAL ERROR: Migration 46: Invalid AccountsController internalAccounts accounts state error: '${accountsControllerState.internalAccounts.accounts}'`,
      ),
    );
    return state;
  }

  if (
    Object.values(accountsControllerState.internalAccounts.accounts).some(
      (account) => !isObject(account),
    )
  ) {
    const invalidEntry = Object.entries(
      accountsControllerState.internalAccounts.accounts,
    ).find(([_, account]) => !isObject(account));
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: Invalid AccountsController entry with id: '${
          invalidEntry?.[0]
        }', type: '${typeof invalidEntry?.[1]}'`,
      ),
    );
    return state;
  }

  const preferencesControllerState = state.engine.backgroundState
    .PreferencesController as PreferencesState;

  if (!isObject(preferencesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: Invalid PreferencesController state error: '${JSON.stringify(
          preferencesControllerState,
        )}'`,
      ),
    );
    return state;
  }

  if (
    !hasProperty(preferencesControllerState, 'identities') ||
    !isObject(preferencesControllerState.identities)
  ) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 46: Invalid PreferencesController identities state error: '${preferencesControllerState.identities}'`,
      ),
    );
    return state;
  }

  const accounts = accountsControllerState.internalAccounts.accounts;
  Object.keys(accountsControllerState.internalAccounts.accounts).forEach(
    (accountId) => {
      const account = accounts[accountId];
      if (
        isObject(account) &&
        isObject(account.metadata) &&
        !account.metadata.importTime
      ) {
        if (Object.keys(preferencesControllerState.identities).length) {
          Object.keys(preferencesControllerState.identities).forEach(
            (identityAddress) => {
              if (
                toChecksumHexAddress(identityAddress) ===
                toChecksumHexAddress(account.address as string)
              ) {
                (
                  accountsControllerState as AccountsControllerState
                ).internalAccounts.accounts[accountId].metadata.importTime =
                  preferencesControllerState.identities[identityAddress]
                    .importTime ?? Date.now();
              }
            },
          );
        } else {
          (
            accountsControllerState as AccountsControllerState
          ).internalAccounts.accounts[accountId].metadata.importTime =
            Date.now();
        }
      }
    },
  );

  return state;
}
