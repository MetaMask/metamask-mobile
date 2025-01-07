import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { MAINNET } from '../../constants/network';

interface State {
  engine: {
    backgroundState: {
      PreferencesController: {
        smartTransactionsOptInStatus?: boolean | null;
        smartTransactionsMigrationApplied?: boolean;
      };
      SmartTransactionsController?: {
        smartTransactionsState: {
          smartTransactions: Record<string, unknown[]>;
        };
      };
    };
  };
}

export default function migrate(state: unknown) {
  if (!isObject(state)) {
    captureException(
      new Error(`FATAL ERROR: Migration 65: Invalid state error: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 65: Invalid engine state error: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 65: Invalid engine backgroundState error: '${typeof state.engine.backgroundState}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState.PreferencesController)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 65: Invalid PreferencesController state error: '${typeof state.engine.backgroundState.PreferencesController}'`,
      ),
    );
    return state;
  }

  // Clone state to avoid mutations
  const newState = { ...state } as unknown as State;
  const preferences = newState.engine.backgroundState.PreferencesController;

  // Check current STX opt-in status
  const currentOptInStatus = preferences.smartTransactionsOptInStatus;

  // Enable STX by default unless user has explicitly opted out
  if (
    currentOptInStatus === undefined ||
    currentOptInStatus === null ||
    (currentOptInStatus === false && !hasExistingSmartTransactions(newState))
  ) {
    preferences.smartTransactionsOptInStatus = true;
    preferences.smartTransactionsMigrationApplied = true;
  } else {
    preferences.smartTransactionsMigrationApplied = true;
  }

  return newState;
}

function hasExistingSmartTransactions(state: State): boolean {
  const smartTransactions =
    state.engine.backgroundState.SmartTransactionsController?.smartTransactionsState?.smartTransactions;

  if (!isObject(smartTransactions)) {
    return false;
  }

  return (smartTransactions[MAINNET] || []).length > 0;
}
