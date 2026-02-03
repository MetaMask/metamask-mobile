import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

export const migrationVersion = 116;

const defaultUserRegionResourceState = null;

/**
 * Migration 116: Migrate RampsController userRegion from legacy string to ResourceState
 *
 * The first iteration of RampsController stored userRegion as a string (e.g. "us-ca"). Now it uses objects.
 * If userRegion is a string, set it to null so the controller will geolocate and set the
 * correct object on init.
 *
 * @param state - The persisted Redux state (with engine.backgroundState inflated)
 * @returns The migrated Redux state
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state.engine.backgroundState, 'RampsController')) {
      return state;
    }

    const rampsController = state.engine.backgroundState.RampsController;

    if (!isObject(rampsController)) {
      return state;
    }

    if (
      hasProperty(rampsController, 'userRegion') &&
      typeof rampsController.userRegion === 'string'
    ) {
      rampsController.userRegion = defaultUserRegionResourceState;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
}
