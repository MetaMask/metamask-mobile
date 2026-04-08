import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';

import { ensureValidState } from './util';

export const migrationVersion = 132;

/**
 * Migration 132: Enable hideZeroBalanceTokens for all users.
 *
 * Sets `settings.hideZeroBalanceTokens` to `true` so that zero-balance tokens
 * are hidden by default on the homepage tokens section.
 */
const migration = (state: unknown): unknown => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state, 'settings') || !isObject(state.settings)) {
      return state;
    }

    state.settings.hideZeroBalanceTokens = true;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to enable hideZeroBalanceTokens: ${String(
          error,
        )}`,
      ),
    );
  }

  return state;
};

export default migration;
