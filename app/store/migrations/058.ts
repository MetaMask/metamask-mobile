import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import { captureErrorException } from '../../util/sentry';

export default function migrate(state: unknown) {
  if (!ensureValidState(state, 58)) {
    // Increment the migration number as appropriate
    return state;
  }

  if (!isObject(state.settings)) {
    captureErrorException(
      new Error(
        `FATAL ERROR: Migration 58: Invalid Settings state error: '${typeof state.settings}'`,
      ),
    );
    return state;
  }

  state.settings.searchEngine = 'Google';

  // Return the modified state
  return state;
}
