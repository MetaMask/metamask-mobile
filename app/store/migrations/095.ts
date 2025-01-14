import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

export interface State {
  engine: {
    backgroundState: {
      PreferencesController: {
        smartTransactionsOptInStatus?: boolean | null;
        smartTransactionsMigrationApplied?: boolean;
      };
    };
  };
}

export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 65: Invalid state error: '${state === null ? 'null' : typeof state}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    return state;
  }

  if (!isObject(state.engine.backgroundState.PreferencesController)) {
    return state;
  }

  // Clone state to avoid mutations
  const newState = { ...state } as unknown as State;
  const preferences = newState.engine.backgroundState.PreferencesController;

  // Setup the state as if it's a pre-STX state
  // This simulates a user who has STX disabled from an old version
  preferences.smartTransactionsOptInStatus = false;
  preferences.smartTransactionsMigrationApplied = false;

  return newState;
}
