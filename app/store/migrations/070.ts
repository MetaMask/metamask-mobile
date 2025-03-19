import { hasProperty } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureException } from '@sentry/react-native';

/**
 * Migration 70: Remove 'staking' reducer data
 *
 * This migration removes the 'staking' key from the state that was previously
 * in the application but has been removed. This fixes the Redux error:
 * "Unexpected key 'staking' found in previous state received by the reducer."
 */
const migration = (state: unknown): unknown => {
  const migrationVersion = 70;

  // Ensure the state is valid for migration
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    // Remove the staking key if it exists
    if (hasProperty(state, 'staking')) {
      delete state.staking;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 070: removing staking key failed with error: ${error}`,
      ),
    );
    return state;
  }
};

export default migration;
