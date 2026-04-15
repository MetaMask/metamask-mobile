import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { cloneDeep } from 'lodash';

const migrationVersion = 125;

/**
 * Migration 125: Remove smartAccountOptInForAccounts, identities, selectedAddress, lostIdentities from PreferencesController
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default async function migrate(versionedState: unknown) {
  if (!ensureValidState(versionedState, migrationVersion)) {
    return versionedState;
  }

  const state = cloneDeep(versionedState);

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
