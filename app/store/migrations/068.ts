import { isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

export interface State {
  engine: {
    backgroundState: {
      PreferencesController: {
        smartTransactionsOptInStatus: boolean;
        featureFlags: {
          smartTransactionsMigrationApplied: boolean;
          smartTransactionsBannerDismissed: boolean;
        };
      };
    };
  };
}

export default function migrate(state: unknown) {
  // eslint-disable-next-line no-console
  console.log('Migration 68 started');

  if (!isObject(state)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 67: Invalid state error: '${state === null ? 'null' : typeof state}'`,
      ),
    );
    return state;
  }
  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 67: Invalid engine state error: '${state.engine === null ? 'null' : typeof state.engine}'`,
      ),
    );
    return state;
  }
  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 67: Invalid engine backgroundState error: '${state.engine.backgroundState === null ? 'null' : typeof state.engine.backgroundState}'`,
      ),
    );
    return state;
  }
  if (!isObject(state.engine.backgroundState.PreferencesController)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 67: Invalid PreferencesController state error: '${state.engine.backgroundState.PreferencesController === null ? 'null' : typeof state.engine.backgroundState.PreferencesController}'`,
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
      smartTransactionsMigrationApplied: false,
    };
  }

  // Check current STX opt-in status
  const currentOptInStatus = preferences.smartTransactionsOptInStatus;

  if (currentOptInStatus === true) {
    // User already had it on - no migration change made
    preferences.smartTransactionsOptInStatus = true;
    preferences.featureFlags.smartTransactionsMigrationApplied = false;  // Changed to false
  } else {
    // We're changing their setting - mark as migrated
    preferences.smartTransactionsOptInStatus = true;
    preferences.featureFlags.smartTransactionsMigrationApplied = true;  // Changed to true
  }

  preferences.featureFlags.smartTransactionsBannerDismissed = false;

  // eslint-disable-next-line no-console
  console.log('Migration 68 completed');
  return newState;
}
