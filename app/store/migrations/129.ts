import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 129: Move `SnapsRegistry` state to `SnapRegistryController`.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 129;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  if (
    !hasProperty(state.engine.backgroundState, 'SnapsRegistry') ||
    !isObject(state.engine.backgroundState.SnapsRegistry)
  ) {
    return state;
  }

  state.engine.backgroundState.SnapRegistryController =
    state.engine.backgroundState.SnapsRegistry;
  delete state.engine.backgroundState.SnapsRegistry;

  return state;
};

export default migration;
