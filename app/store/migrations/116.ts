import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

export const migrationVersion = 116;

/**
 * Migration 116: Migrate RampsController userRegion to UserRegion | null
 *
 * - Legacy: userRegion was a string (e.g. "us-ca") -> set to null so controller geolocates on init.
 * - Previous: userRegion was ResourceState (object with data, selected, isLoading, error) -> set to .data.
 * - Current: userRegion is UserRegion | null -> leave unchanged.
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

    if (!hasProperty(rampsController, 'userRegion')) {
      return state;
    }

    const value = rampsController.userRegion;

    if (typeof value === 'string') {
      rampsController.userRegion = null;
      return state;
    }

    if (isObject(value) && hasProperty(value, 'data')) {
      rampsController.userRegion = value.data;
      return state;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(`Migration ${migrationVersion} failed: ${error}`),
    );
    return state;
  }
}
