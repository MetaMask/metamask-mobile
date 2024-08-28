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
  migrationDetails?: {
    changesCount: number;
    timestamp: number;
    version: string;
    changedFields: string[];
  };
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
  const changedFields: string[] = [];

  if ('contractExchangeRates' in updatedTokenRatesControllerState) {
    delete updatedTokenRatesControllerState.contractExchangeRates;
    changedFields.push('contractExchangeRates');
  }

  if ('contractExchangeRatesByChainId' in updatedTokenRatesControllerState) {
    delete updatedTokenRatesControllerState.contractExchangeRatesByChainId;
    changedFields.push('contractExchangeRatesByChainId');
  }

  const changesCount = changedFields.length;

  if (changesCount === 0) {
    return {
      ...state as MigratedState,
      migrationStatus: 'no_changes_needed',
      migrationDetails: {
        changesCount: 0,
        timestamp: Date.now(),
        version: '48.1',
        changedFields: [],
      },
    };
  }

  // Add migration metadata
  const migrationDetails = {
    changesCount,
    timestamp: Date.now(),
    version: '48.1',
    changedFields,
  };

  updatedTokenRatesControllerState.migrationMetadata = migrationDetails;

  // Add a random element to ensure variability
  updatedTokenRatesControllerState.migrationRandomId = Math.random().toString(36).substring(2, 15);

  // Determine migration status based on changes
  const migrationStatus = changesCount === 1 ? 'partial_success' : 'full_success';

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
    migrationStatus,
    migrationDetails,
  };
}
