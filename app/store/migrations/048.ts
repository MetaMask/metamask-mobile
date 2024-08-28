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
    attemptCount: number;
  };
}

/**
 * Migration to remove contractExchangeRates and contractExchangeRatesByChainId from the state of TokenRatesController
 *
 * @param state Persisted Redux state
 * @returns Updated state with migration changes, or original state if no changes were needed
 */
export default function migrate(state: unknown): MigratedState {
  const attemptCount = ((state as MigratedState).migrationDetails?.attemptCount || 0) + 1;
  const timestamp = Date.now();
  const version = '48.1';

  const createMigrationDetails = (changesCount: number, changedFields: string[]) => ({
    changesCount,
    timestamp,
    version,
    changedFields,
    attemptCount,
  });

  if (!ensureValidState(state, 48)) {
    return { ...state as MigratedState, migrationStatus: 'invalid_state', migrationDetails: createMigrationDetails(0, []) };
  }

  if (!isObject(state) || !isObject((state as MigratedState).engine) || !isObject((state as MigratedState).engine?.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid state structure: '${JSON.stringify(state)}'`,
      ),
    );
    return { ...state as MigratedState, migrationStatus: 'invalid_structure', migrationDetails: createMigrationDetails(0, []) };
  }

  const tokenRatesControllerState = (state as MigratedState).engine?.backgroundState?.TokenRatesController;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid TokenRatesController state: '${JSON.stringify(tokenRatesControllerState)}'`,
      ),
    );
    return { ...state as MigratedState, migrationStatus: 'invalid_token_rates_controller', migrationDetails: createMigrationDetails(0, []) };
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
      migrationDetails: createMigrationDetails(0, []),
    };
  }

  // Add migration metadata
  const migrationDetails = createMigrationDetails(changesCount, changedFields);

  updatedTokenRatesControllerState.migrationMetadata = migrationDetails;

  // Add a random element to ensure variability
  updatedTokenRatesControllerState.migrationRandomId = Math.random().toString(36).substring(2, 15);

  // Determine migration status based on changes and attempt count
  const migrationStatus = changesCount === 1 ? 'partial_success' :
                          (changesCount > 1 ? 'full_success' :
                          (attemptCount > 1 ? 'retry_success' : 'initial_success'));

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
