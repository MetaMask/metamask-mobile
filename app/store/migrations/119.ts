import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';
import StorageWrapper from '../storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  PASSCODE_DISABLED,
  TRUE,
} from '../../constants/storage';

export const migrationVersion = 119;

interface MigrationState {
  security: {
    allowLoginWithRememberMe: boolean;
    osAuthEnabled: boolean;
  };
}

/**
 * Migration 119: Derive osAuthEnabled from existing auth preferences
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
const migration = async (state: unknown): Promise<unknown> => {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const typedState = state as unknown as MigrationState;

  try {
    // 1. If Remember Me is on, osAuthEnabled should be false
    if (typedState.security.allowLoginWithRememberMe) {
      typedState.security.osAuthEnabled = false;
      return state;
    }

    // 2. Derive from legacy storage flags
    const biometryChoiceDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodeDisabled = await StorageWrapper.getItem(PASSCODE_DISABLED);

    // Legacy user preference selected device biometrics
    const legacyUserChoseBiometrics =
      passcodeDisabled === TRUE && !biometryChoiceDisabled;

    // Legacy user preference selected device passcode
    const legacyUserChosePasscode =
      biometryChoiceDisabled === TRUE && !passcodeDisabled;

    // If either flag doesn't exist (null/undefined), osAuthEnabled is true
    // Only false if BOTH exist and are truthy (both disabled)
    const osAuthEnabled = legacyUserChoseBiometrics || legacyUserChosePasscode;

    typedState.security.osAuthEnabled = osAuthEnabled;
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
