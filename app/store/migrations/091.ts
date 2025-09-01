import { hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';

/**
 * Migration 091: Remove alert state from persisted data
 *
 * This migration fixes the issue where clipboard alerts persist across app restarts.
 * Alert state should be ephemeral and not persisted. This removes any existing
 * alert state that was incorrectly persisted in previous versions.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, 91)) {
    return state;
  }

  try {
    if (hasProperty(state, 'alert')) {
      const { alert: alertState, ...stateWithoutAlert } = state;
      return stateWithoutAlert;
    }

    return state;
  } catch (error) {
    captureException(
      new Error(
        `Migration 091: Failed to remove alert state from persisted data: ${String(
          error,
        )}`,
      ),
    );

    // Return the original state if migration fails to avoid breaking the app
    return state;
  }
}
