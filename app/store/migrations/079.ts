import { captureException } from '@sentry/react-native';

import { ensureValidState } from './util';

/**
 * Migration 77: Add 'Seedless Onboarding default state' to seedless onboarding controller
 *
 * This migration add Seedless Onboarding default state to the seedless onboarding controller
 * as a default Seedless Onboarding State.
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 79;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // no state migration needed as new controller is introduced with default values
    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 077: Adding Seedless Onboarding default state failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
