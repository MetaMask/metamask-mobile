import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration to remove deprecated `TxController` key if it is present in state
 * @param state Persisted Redux state
 * @returns Valid persisted Redux state
 */
export default function migrate(state: unknown) {
  if (!ensureValidState(state, 51)) {
    return state;
  }

  const backgroundState = state.engine.backgroundState;

  if (!isObject(backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 51: Invalid backgroundState error: '${typeof backgroundState}'`,
      ),
    );
    return state;
  }

  if (hasProperty(backgroundState, 'TxController')) {
    delete backgroundState.TxController;
  }

  return state;
}
