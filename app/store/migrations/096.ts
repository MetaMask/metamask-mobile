import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { MAINNET } from '../../constants/network';

export interface State {
  engine: {
    backgroundState: {
      PreferencesController: {
        smartTransactionsOptInStatus: boolean;
        smartTransactionsMigrationApplied: boolean;
        featureFlags: {
          smartTransactionsBannerDismissed: boolean;
        };
      };
      SmartTransactionsController?: {
        smartTransactionsState: {
          smartTransactions: Record<string, unknown[]>;
        };
      };
    };
  };
}

function isSmartTransactionsState(state: unknown): state is {
  smartTransactionsState: { smartTransactions: Record<string, unknown[]> };
} {
  return (
    isObject(state) &&
    'smartTransactionsState' in state &&
    isObject(state.smartTransactionsState) &&
    'smartTransactions' in state.smartTransactionsState
  );
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
    captureException(
      new Error(
        `FATAL ERROR: Migration 65: Invalid engine state error: '${state.engine === null ? 'null' : typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 65: Invalid engine backgroundState error: '${state.engine.backgroundState === null ? 'null' : typeof state.engine.backgroundState}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState.PreferencesController)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 65: Invalid PreferencesController state error: '${state.engine.backgroundState.PreferencesController === null ? 'null' : typeof state.engine.backgroundState.PreferencesController}'`,
      ),
    );
    return state;
  }

  // Clone state to avoid mutations
  const newState = { ...state } as unknown as State;
  const preferences = newState.engine.backgroundState.PreferencesController;

  // Initialize featureFlags if it doesn't exist
  if (!preferences.featureFlags) {
    preferences.featureFlags = {
      smartTransactionsBannerDismissed: false,
    };
  }

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

  preferences.featureFlags.smartTransactionsBannerDismissed = false;

  return newState;
}

function hasExistingSmartTransactions(state: State): boolean {
  if (!state.engine.backgroundState.SmartTransactionsController) {
    return false;
  }

  if (!isSmartTransactionsState(state.engine.backgroundState.SmartTransactionsController)) {
    return false;
  }

  const smartTransactions = state.engine.backgroundState.SmartTransactionsController.smartTransactionsState.smartTransactions;
  return (smartTransactions[MAINNET] || []).length > 0;
}
