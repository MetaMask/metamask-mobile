import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { cloneDeep } from 'lodash';

const migrationVersion = 127;

/**
 * Migration 127: Remove deprecated SwapsController from persisted backgroundState.
 * The swaps functionality is now handled by BridgeController and BridgeStatusController.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default async function migrate(versionedState: unknown) {
  if (!ensureValidState(versionedState, migrationVersion)) {
    return versionedState;
  }

  const state = cloneDeep(versionedState);

  const backgroundState = state.engine.backgroundState;

  if (!isObject(backgroundState)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid backgroundState: '${typeof backgroundState}'`,
      ),
    );
    return state;
  }

  if (hasProperty(backgroundState, 'SwapsController')) {
    delete backgroundState.SwapsController;
  }

  return state;
}
