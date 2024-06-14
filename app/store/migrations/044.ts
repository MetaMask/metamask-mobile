import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

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
  const preferencesControllerState =
    state.engine.backgroundState.PreferencesController;

  return state;
}
