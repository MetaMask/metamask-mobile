import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 57)) {
    // Increment the migration number as appropriate
    return state;
  }

  if (!isObject(state.settings)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 57: Invalid Settings state error: '${typeof state.settings}'`,
      ),
    );
    return state;
  }

  state.settings.searchEngine = 'Google';

  // Return the modified state
  return state;
}
