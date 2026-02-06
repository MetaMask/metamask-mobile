import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
} from '../../constants/storage';

export const migrationVersion = 118;

/**
 * Migration 118: Derive osAuthEnabled from legacy storage flags
 *
 * This migration:
 * - Reads BIOMETRY_CHOICE_DISABLED and PASSCODE_DISABLED from StorageWrapper
 * - Sets state.security.osAuthEnabled based on the logic:
 * - osAuthEnabled = !biometryDisabled || !passcodeDisabled
 * - If either biometrics or passcode is enabled, osAuthEnabled is true
 * - If both are disabled (password-only mode), osAuthEnabled is false
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    const biometryDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodeDisabled = await StorageWrapper.getItem(PASSCODE_DISABLED);
    const osAuthEnabled = !biometryDisabled || !passcodeDisabled;
    state.security.osAuthEnabled = osAuthEnabled;
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
