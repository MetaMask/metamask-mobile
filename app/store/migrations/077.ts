import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 77: Remove `KeyringController.keyringsMetadata`
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 77;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (
    hasProperty(state, 'engine') &&
    hasProperty(state.engine, 'backgroundState') &&
    hasProperty(state.engine.backgroundState, 'KeyringController') &&
    isObject(state.engine.backgroundState.KeyringController) &&
    hasProperty(
      state.engine.backgroundState.KeyringController,
      'keyringsMetadata',
    )
  ) {
    // Remove the keyringsMetadata property
    delete state.engine.backgroundState.KeyringController.keyringsMetadata;
  }

  return state;
};

export default migration;
