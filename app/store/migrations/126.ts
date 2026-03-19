import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

const migrationVersion = 126;

/**
 * Migration 126: Fix AccountsController selectedAccount that is missing or undefined.
 *
 * Migration 059 attempted to fix this but used `hasProperty` which returns false
 * when the key is entirely absent (the common case after JSON.stringify/JSON.parse
 * roundtrip strips undefined values). This migration covers both cases:
 * - selectedAccount key is missing from internalAccounts
 * - selectedAccount is explicitly undefined
 * - selectedAccount is not a string
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (
    !hasProperty(state.engine.backgroundState, 'AccountsController') ||
    !isObject(state.engine.backgroundState.AccountsController)
  ) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: AccountsController state is missing or invalid: '${typeof state.engine.backgroundState.AccountsController}'`,
      ),
    );
    return state;
  }

  const accountsController = state.engine.backgroundState.AccountsController;

  if (
    !hasProperty(accountsController, 'internalAccounts') ||
    !isObject(accountsController.internalAccounts)
  ) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: internalAccounts is missing or invalid: '${typeof accountsController.internalAccounts}'`,
      ),
    );
    return state;
  }

  const { internalAccounts } = accountsController;
  const hasKey = hasProperty(internalAccounts, 'selectedAccount');
  const currentValue = (internalAccounts as Record<string, unknown>)
    .selectedAccount;

  if (hasKey && typeof currentValue === 'string' && currentValue.length > 0) {
    return state;
  }

  // Report the exact corruption type to Sentry for diagnostics
  const corruptionType = !hasKey
    ? 'key_missing'
    : currentValue === undefined
      ? 'value_undefined'
      : typeof currentValue !== 'string'
        ? `wrong_type_${typeof currentValue}`
        : 'empty_string';

  captureException(
    new Error(
      `Migration ${migrationVersion}: selectedAccount is corrupt (${corruptionType}). hasKey=${hasKey}, typeof=${typeof currentValue}, value=${String(currentValue)}`,
    ),
  );

  // Try to recover: set to the first account ID if accounts exist
  if (
    hasProperty(internalAccounts, 'accounts') &&
    isObject(internalAccounts.accounts)
  ) {
    const accountIds = Object.keys(internalAccounts.accounts);
    if (accountIds.length > 0) {
      const firstAccount = internalAccounts.accounts[accountIds[0]];
      if (isObject(firstAccount) && hasProperty(firstAccount, 'id')) {
        const accountId = firstAccount.id;
        if (typeof accountId === 'string' && accountId.length > 0) {
          (internalAccounts as Record<string, unknown>).selectedAccount =
            accountId;
          return state;
        }
      }
    }
  }

  // Fallback: set to empty string so AccountsController auto-reconciles
  (internalAccounts as Record<string, unknown>).selectedAccount = '';
  return state;
}
