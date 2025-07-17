import { captureException } from '@sentry/react-native';
import { hasProperty } from '@metamask/utils';

import { ensureValidState } from './util';

/**
 * Migration 87: Add 'Seedless Onboarding default state' to seedless onboarding controller
 *
 * This migration add Seedless Onboarding default state to the seedless onboarding controller
 * as a default Seedless Onboarding State.
 *
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 87;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state.engine.backgroundState, 'SeedlessOnboardingController')
    ) {
      // migrate seedless onboarding state with default values
      state.engine.backgroundState.SeedlessOnboardingController = {
        socialBackupsMetadata: [],
      };
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Adding Seedless Onboarding default state failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
