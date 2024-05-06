import { PreferencesState } from '@metamask/preferences-controller';
import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';

/**
 * Enable security alerts by default.
 * @param {any} state - Redux state.
 * @returns Migrated Redux state.
 */
export default async function migrate(stateAsync: unknown) {
  const state = await stateAsync;
  if (!isObject(state)) {
    captureException(
      new Error(`Migration 30: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 30: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 30: Invalid root engine backgroundState: '${typeof state
          .engine.backgroundState}'`,
      ),
    );
    return state;
  }

  const preferencesControllerState = state.engine.backgroundState
    .PreferencesController as PreferencesState;

  if (!isObject(preferencesControllerState)) {
    captureException(
      new Error(
        `Migration 30: Invalid PreferencesController state: '${typeof preferencesControllerState}'`,
      ),
    );
    return state;
  }

  if (!preferencesControllerState.securityAlertsEnabled) {
    preferencesControllerState.securityAlertsEnabled = true;
  }

  return state;
}
