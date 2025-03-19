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
  if (!state) return state;

  if (!ensureValidState(state, 70)) {
    return state;
  }

  try {
    // Create a copy of the state
    const newState = { ...state } as Record<string, unknown>;

    // Remove the staking key if it exists
    if ('staking' in newState) {
      delete newState.staking;
    }

    return newState;
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
