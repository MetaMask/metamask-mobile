import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

const migrationVersion = 125;

/**
 * Migration 125: Remove smartAccountOptInForAccounts, identities, selectedAddress, lostIdentities from PreferencesController
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default async function migrate(state: unknown) {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const preferencesControllerState =
    state.engine.backgroundState.PreferencesController;

  if (!isObject(preferencesControllerState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid PreferencesController state: '${typeof preferencesControllerState}'`,
      ),
    );
    return state;
  }

  if (hasProperty(preferencesControllerState, 'smartAccountOptInForAccounts')) {
    delete preferencesControllerState.smartAccountOptInForAccounts;
  }

  if (hasProperty(preferencesControllerState, 'identities')) {
    delete preferencesControllerState.identities;
  }

  if (hasProperty(preferencesControllerState, 'selectedAddress')) {
    delete preferencesControllerState.selectedAddress;
  }

  if (hasProperty(preferencesControllerState, 'lostIdentities')) {
    delete preferencesControllerState.lostIdentities;
  }

  return state;
}
