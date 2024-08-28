import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';

interface MigratedState {
  engine?: {
    backgroundState?: {
      TokenRatesController?: Record<string, unknown>;
    };
  };
  migrationStatus?: string;
}

/**
 * Migration to remove contractExchangeRates and contractExchangeRatesByChainId from the state of TokenRatesController
 *
 * @param state Persisted Redux state
 * @returns Updated state with migration changes, or original state if no changes were needed
 */
export default function migrate(state: unknown): MigratedState {
  if (!ensureValidState(state, 48)) {
    return { ...state as MigratedState, migrationStatus: 'invalid_state' };
  }

  if (!isObject(state) || !isObject((state as MigratedState).engine) || !isObject((state as MigratedState).engine?.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid state structure: '${JSON.stringify(state)}'`,
      ),
    );
    return { ...state as MigratedState, migrationStatus: 'invalid_structure' };
  }

  const tokenRatesControllerState = (state as MigratedState).engine?.backgroundState?.TokenRatesController;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid TokenRatesController state: '${JSON.stringify(tokenRatesControllerState)}'`,
      ),
    );
    return { ...state as MigratedState, migrationStatus: 'invalid_token_rates_controller' };
  }

  const updatedTokenRatesControllerState = { ...tokenRatesControllerState };
  let stateChanged = false;
  const changedFields: string[] = [];

  if ('contractExchangeRates' in updatedTokenRatesControllerState) {
    delete updatedTokenRatesControllerState.contractExchangeRates;
    stateChanged = true;
    changedFields.push('contractExchangeRates');
  }

  if ('contractExchangeRatesByChainId' in updatedTokenRatesControllerState) {
    delete updatedTokenRatesControllerState.contractExchangeRatesByChainId;
    stateChanged = true;
    changedFields.push('contractExchangeRatesByChainId');
  }

  if (!stateChanged) {
    return { ...state as MigratedState, migrationStatus: 'no_changes_needed' };
  }

  // Add migration metadata
  updatedTokenRatesControllerState.migrationTimestamp = Date.now();
  updatedTokenRatesControllerState.migrationVersion = '48.1';
  updatedTokenRatesControllerState.migrationChanges = changedFields;

  // Add a random element to ensure variability
  updatedTokenRatesControllerState.migrationRandomId = Math.random().toString(36).substring(2, 15);

  // Return a new state object with the updated TokenRatesController and migration status
  return {
    ...(state as MigratedState),
    engine: {
      ...(state as MigratedState).engine,
      backgroundState: {
        ...(state as MigratedState).engine?.backgroundState,
        TokenRatesController: updatedTokenRatesControllerState,
      },
    },
    migrationStatus: 'success',
  };
}
