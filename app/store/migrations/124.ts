import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 121: Change default search engine to Brave
 *
 * All existing users will be migrated to 'Brave' for a privacy-focused,
 * ad-free search experience.
 *
 * @param state - The persisted Redux state
 * @returns The migrated Redux state
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 121)) {
    return state;
  }

  if (!isObject(state.settings)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 121: Invalid Settings state error: '${typeof state.settings}'`,
      ),
    );
    return state;
  }

  state.settings.searchEngine = 'Brave';

  return state;
}
