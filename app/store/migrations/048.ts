import { captureException } from '@sentry/react-native';
import { isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import crypto from 'crypto';

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
  stateComplexity?: number;
  migrationPerformance?: {
    duration: number;
    memoryUsage: number;
  };
  migrationResult?: {
    status: string;
    details: any;
    hash: string;
  };
  stateHash?: string;
  dataIntegrity?: {
    status: string;
    checksum: string;
  };
}

/**
 * Migration to remove contractExchangeRates and contractExchangeRatesByChainId from the state of TokenRatesController
 *
 * @param state Persisted Redux state
 * @returns Updated state with migration changes, or original state if no changes were needed
 */
export default function migrate(state: unknown): MigratedState {
  const startTime = process.hrtime();
  const startMemory = process.memoryUsage().heapUsed;

  const attemptCount = ((state as MigratedState).migrationDetails?.attemptCount || 0) + 1;
  const timestamp = Date.now();
  const version = '48.3';

  const createMigrationDetails = (changesCount: number, changedFields: string[]) => ({
    changesCount,
    timestamp,
    version,
    changedFields,
    attemptCount,
  });

  const generateMigrationResult = (status: string, details: any) => ({
    status,
    details,
    hash: crypto.createHash('sha256').update(JSON.stringify(details)).digest('hex').substr(0, 16),
  });

  const stateHash = calculateStateHash(state);

  if (!ensureValidState(state, 48)) {
    return {
      ...state as MigratedState,
      migrationStatus: 'invalid_state',
      migrationDetails: createMigrationDetails(0, []),
      migrationResult: generateMigrationResult('invalid_state', { error: 'Invalid state' }),
      stateHash,
    };
  }

  if (!isObject(state) || !isObject((state as MigratedState).engine) || !isObject((state as MigratedState).engine?.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid state structure: '${JSON.stringify(state)}'`,
      ),
    );
    return {
      ...state as MigratedState,
      migrationStatus: 'invalid_structure',
      migrationDetails: createMigrationDetails(0, []),
      migrationResult: generateMigrationResult('invalid_structure', { error: 'Invalid state structure' }),
      stateHash,
    };
  }

  const tokenRatesControllerState = (state as MigratedState).engine?.backgroundState?.TokenRatesController;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid TokenRatesController state: '${JSON.stringify(tokenRatesControllerState)}'`,
      ),
    );
    return {
      ...state as MigratedState,
      migrationStatus: 'invalid_token_rates_controller',
      migrationDetails: createMigrationDetails(0, []),
      migrationResult: generateMigrationResult('invalid_token_rates_controller', { error: 'Invalid TokenRatesController state' }),
      stateHash,
    };
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
  const stateComplexity = calculateStateComplexity(state as MigratedState);
  const dataIntegrity = checkDataIntegrity(updatedTokenRatesControllerState);

  if (changesCount === 0) {
    return {
      ...state as MigratedState,
      migrationStatus: 'no_changes_needed',
      migrationDetails: createMigrationDetails(0, []),
      stateComplexity,
      migrationResult: generateMigrationResult('no_changes_needed', { changesCount: 0, stateComplexity }),
      stateHash,
      dataIntegrity,
    };
  }

  // Add migration metadata
  const migrationDetails = createMigrationDetails(changesCount, changedFields);

  updatedTokenRatesControllerState.migrationMetadata = migrationDetails;

  // Determine migration status based on changes, attempt count, and state complexity
  const migrationStatus = determineMigrationStatus(changesCount, attemptCount, stateComplexity);

  const endTime = process.hrtime(startTime);
  const endMemory = process.memoryUsage().heapUsed;

  const migrationPerformance = {
    duration: endTime[0] * 1000 + endTime[1] / 1e6, // Convert to milliseconds
    memoryUsage: endMemory - startMemory,
  };

  // Generate a unique migration result
  const migrationResult = generateMigrationResult(migrationStatus, {
    changesCount,
    changedFields,
    stateComplexity,
    performance: migrationPerformance,
    dataIntegrity,
  });

  // Return a new state object with the updated TokenRatesController, migration status, and performance metrics
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
    stateComplexity,
    migrationPerformance,
    migrationResult,
    stateHash,
    dataIntegrity,
  };
}

function calculateStateComplexity(state: MigratedState): number {
  const countProperties = (obj: any): number => {
    if (typeof obj !== 'object' || obj === null) return 1;
    return Object.keys(obj).reduce((sum, key) => sum + countProperties(obj[key]), 0);
  };
  return countProperties(state);
}

function determineMigrationStatus(changesCount: number, attemptCount: number, stateComplexity: number): string {
  if (changesCount === 0) return 'no_changes_needed';
  if (changesCount === 1) return 'partial_success';
  if (changesCount > 1) {
    if (stateComplexity > 50) return 'complex_full_success';
    return 'simple_full_success';
  }
  if (attemptCount > 1) return 'retry_success';
  return 'initial_success';
}

function calculateStateHash(state: unknown): string {
  return crypto.createHash('sha256').update(JSON.stringify(state)).digest('hex');
}

function checkDataIntegrity(state: Record<string, unknown>): { status: string; checksum: string } {
  const checksum = crypto.createHash('md5').update(JSON.stringify(state)).digest('hex');
  const status = Object.keys(state).length > 0 ? 'valid' : 'empty';
  return { status, checksum };
}
