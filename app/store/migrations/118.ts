import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../constants/storage';

export const migrationVersion = 118;

interface MigrationState {
  security?: {
    allowLoginWithRememberMe?: boolean;
    osAuthEnabled?: boolean;
  };
}

/**
 * Migration 118: Derive osAuthEnabled from existing auth preferences
 *
 * Priority order:
 * 1. If allowLoginWithRememberMe is true → osAuthEnabled = false
 *    (Remember Me takes precedence, biometric/passcode toggle should be disabled)
 * 2. Otherwise, derive from legacy storage flags:
 *    - If BIOMETRY_CHOICE_DISABLED doesn't exist OR PASSCODE_DISABLED doesn't exist
 *      → osAuthEnabled = true (user is likely using one of them)
 *    - If both exist and are truthy (both disabled) → osAuthEnabled = false
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const typedState = state as MigrationState;

  try {
    // 1. If Remember Me is on, osAuthEnabled should be false
    if (typedState.security?.allowLoginWithRememberMe) {
      typedState.security.osAuthEnabled = false;
      return state;
    }

    // 2. Derive from legacy storage flags
    const biometryDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodeDisabled = await StorageWrapper.getItem(PASSCODE_DISABLED);

    // If either flag doesn't exist (null/undefined), osAuthEnabled is true
    // Only false if BOTH exist and are truthy (both disabled)
    const osAuthEnabled = !biometryDisabled || !passcodeDisabled;

    if (typedState.security) {
      typedState.security.osAuthEnabled = osAuthEnabled;
    }
  } catch (error) {
    // Migration failures should not break the app
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to migrate osAuthEnabled: ${error}`,
      ),
    );
  }

  return state;
};

export default migration;
