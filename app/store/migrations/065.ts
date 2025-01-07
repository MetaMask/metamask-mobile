import { isObject, hasProperty } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { MAINNET } from '../../constants/network';

// We can update these types as we learn more about the mobile state structure
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
      new Error(`Migration 65: Invalid root state: '${typeof state}'`),
    );
    return state;
  }

  if (!isObject(state.engine)) {
    captureException(
      new Error(
        `Migration 65: Invalid root engine state: '${typeof state.engine}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState)) {
    captureException(
      new Error(
        `Migration 65: Invalid root engine backgroundState: '${typeof state.engine.backgroundState}'`,
      ),
    );
    return state;
  }

  if (!isObject(state.engine.backgroundState.PreferencesController)) {
    captureException(
      new Error(
        `Migration 65: Invalid PreferencesController state: '${typeof state.engine.backgroundState.PreferencesController}'`,
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
