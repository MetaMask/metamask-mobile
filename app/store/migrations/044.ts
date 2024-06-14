import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import { Identity } from '@metamask/preferences-controller';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import { AccountsControllerState } from '@metamask/accounts-controller';

/**
 * Synchronize `AccountsController` names with `PreferencesController` identities.
 *
 * There was a bug in versions below v7.23.0 that resulted in the account `name` state in the
 * `AccountsController` being reset. However, users account names were preserved in the
 * `identities` state in the `PreferencesController`. This migration restores the names to the
 * `AccountsController` if they are found.
 *
 * @param state Persisted Redux state that is potentially corrupted
 * @returns Valid persisted Redux state
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 44)) {
    return state;
  }

  const accountsControllerState =
    state.engine.backgroundState.AccountsController;

  if (!isObject(accountsControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 44: Invalid AccountsController state error: '${typeof accountsControllerState}'`,
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
        `FATAL ERROR: Migration 44: Invalid AccountsController internalAccounts state error: '${typeof accountsControllerState.internalAccounts}'`,
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
        `FATAL ERROR: Migration 44: Invalid AccountsController internalAccounts accounts state error: '${typeof accountsControllerState
          .internalAccounts.accounts}'`,
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
        `FATAL ERROR: Migration 44: Invalid AccountsController account entry with id: '${
          invalidEntry?.[0]
        }', type: '${typeof invalidEntry?.[1]}'`,
      ),
    );
    return state;
  }

  if (
    Object.values(accountsControllerState.internalAccounts.accounts).some(
      (account) => isObject(account) && !isObject(account.metadata),
    )
  ) {
    const invalidEntry = Object.entries(
      accountsControllerState.internalAccounts.accounts,
    ).find(([_, account]) => isObject(account) && !isObject(account.metadata));
    captureException(
      new Error(
        `FATAL ERROR: Migration 44: Invalid AccountsController account metadata entry with id: '${
          invalidEntry?.[0]
        }', type: '${typeof invalidEntry?.[1]}'`,
      ),
    );
    return state;
  }

  const preferencesControllerState =
    state.engine.backgroundState.PreferencesController;

  if (!isObject(preferencesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 44: Invalid PreferencesController state error: '${typeof preferencesControllerState}'`,
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
        `FATAL ERROR: Migration 44: Invalid PreferencesController identities state error: '${typeof preferencesControllerState.identities}'`,
      ),
    );
    return state;
  }

  if (
    Object.values(preferencesControllerState.identities).some(
      (identity) => !isObject(identity),
    )
  ) {
    const invalidEntry = Object.entries(
      preferencesControllerState.identities,
    ).find(([_, identity]) => !isObject(identity));
    captureException(
      new Error(
        `FATAL ERROR: Migration 44: Invalid PreferencesController identity entry with type: '${typeof invalidEntry?.[1]}'`,
      ),
    );
    return state;
  }

  const accounts = accountsControllerState.internalAccounts.accounts;
  const identities = preferencesControllerState.identities;
  Object.entries(accounts).forEach(([accountId, account]) => {
    if (
      isObject(account) &&
      isObject(account.metadata) &&
      typeof account.address === 'string'
    ) {
      if (Object.keys(identities).length) {
        Object.entries(identities).forEach(([identityAddress, identity]) => {
          if (
            identityAddress.toLowerCase() ===
            (account.address as string).toLowerCase()
          ) {
            if (
              isObject(identity) &&
              isObject(account.metadata) &&
              identity?.name !== account.metadata.name
            ) {
              (
                accountsControllerState as AccountsControllerState
              ).internalAccounts.accounts[accountId].metadata.name =
                identity.name as string;
            }
          }
        });
      }
    }
  });

  return state;
}
