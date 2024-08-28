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
  stateComplexityDelta?: number;
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
  stateSize?: number;
  stateDepth?: number;
  tokenCount?: number;
  lastModified?: number;
  migrationEfficiency?: number;
  riskAssessment?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  stateAnalysis?: {
    keyCount: number;
    maxDepth: number;
    averageDepth: number;
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
  const version = '48.4';

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
  const initialStateComplexity = calculateStateComplexity(state as MigratedState);

  if (!ensureValidState(state, 48)) {
    return createErrorState('invalid_state', 'Invalid state', state as MigratedState, stateHash, initialStateComplexity);
  }

  if (!isObject(state) || !isObject((state as MigratedState).engine) || !isObject((state as MigratedState).engine?.backgroundState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid state structure: '${JSON.stringify(state)}'`,
      ),
    );
    return createErrorState('invalid_structure', 'Invalid state structure', state as MigratedState, stateHash, initialStateComplexity);
  }

  const tokenRatesControllerState = (state as MigratedState).engine?.backgroundState?.TokenRatesController;

  if (!isObject(tokenRatesControllerState)) {
    captureException(
      new Error(
        `FATAL ERROR: Migration 48: Invalid TokenRatesController state: '${JSON.stringify(tokenRatesControllerState)}'`,
      ),
    );
    return createErrorState('invalid_token_rates_controller', 'Invalid TokenRatesController state', state as MigratedState, stateHash, initialStateComplexity);
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
  const finalStateComplexity = calculateStateComplexity(updatedTokenRatesControllerState);
  const stateComplexityDelta = initialStateComplexity - finalStateComplexity;
  const dataIntegrity = checkDataIntegrity(updatedTokenRatesControllerState);

  if (changesCount === 0) {
    return createNoChangesState(state as MigratedState, stateHash, initialStateComplexity, dataIntegrity);
  }

  // Add migration metadata
  const migrationDetails = createMigrationDetails(changesCount, changedFields);

  updatedTokenRatesControllerState.migrationMetadata = migrationDetails;

  // Determine migration status based on changes, attempt count, and state complexity
  const migrationStatus = determineMigrationStatus(changesCount, attemptCount, finalStateComplexity, stateComplexityDelta);

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
    initialStateComplexity,
    finalStateComplexity,
    stateComplexityDelta,
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
    stateComplexity: finalStateComplexity,
    stateComplexityDelta,
    migrationPerformance,
    migrationResult,
    stateHash,
    dataIntegrity,
    stateSize: JSON.stringify(state).length,
    stateDepth: calculateStateDepth(state as MigratedState),
    tokenCount: calculateTokenCount(updatedTokenRatesControllerState),
    lastModified: Date.now(),
    migrationEfficiency: calculateMigrationEfficiency(changesCount, stateComplexityDelta),
    riskAssessment: assessMigrationRisk(changesCount, stateComplexityDelta, attemptCount),
  };
}

function calculateStateComplexity(state: MigratedState | Record<string, unknown>): number {
  const countProperties = (obj: any): number => {
    if (typeof obj !== 'object' || obj === null) return 1;
    return Object.keys(obj).reduce((sum, key) => sum + countProperties(obj[key]), 0);
  };
  return countProperties(state);
}

function determineMigrationStatus(changesCount: number, attemptCount: number, stateComplexity: number, complexityDelta: number): string {
  if (changesCount === 0) return 'no_changes_needed';
  if (changesCount === 1) return 'partial_success';
  if (changesCount > 1) {
    if (stateComplexity > 50) return complexityDelta > 10 ? 'major_complex_success' : 'minor_complex_success';
    return complexityDelta > 5 ? 'major_simple_success' : 'minor_simple_success';
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

function createErrorState(status: string, error: string, state: MigratedState, stateHash: string, stateComplexity: number): MigratedState {
  return {
    ...state,
    migrationStatus: status,
    migrationDetails: createMigrationDetails(0, []),
    migrationResult: generateMigrationResult(status, { error }),
    stateHash,
    stateComplexity,
  };
}

function createNoChangesState(state: MigratedState, stateHash: string, stateComplexity: number, dataIntegrity: { status: string; checksum: string }): MigratedState {
  return {
    ...state,
    migrationStatus: 'no_changes_needed',
    migrationDetails: createMigrationDetails(0, []),
    stateComplexity,
    migrationResult: generateMigrationResult('no_changes_needed', { changesCount: 0, stateComplexity }),
    stateHash,
    dataIntegrity,
  };
}

function createMigrationDetails(changesCount: number, changedFields: string[]): MigratedState['migrationDetails'] {
  return {
    changesCount,
    timestamp: Date.now(),
    version: '48.4',
    changedFields,
    attemptCount: 1,
  };
}

function generateMigrationResult(status: string, details: any): MigratedState['migrationResult'] {
  return {
    status,
    details,
    hash: crypto.createHash('sha256').update(JSON.stringify(details)).digest('hex').substr(0, 16),
  };
}

function calculateStateDepth(state: MigratedState): number {
  const getDepth = (obj: any, currentDepth = 0): number => {
    if (typeof obj !== 'object' || obj === null) return currentDepth;
    return Math.max(...Object.values(obj).map(value => getDepth(value, currentDepth + 1)));
  };
  return getDepth(state);
}

function calculateTokenCount(tokenRatesControllerState: Record<string, unknown>): number {
  return Object.keys(tokenRatesControllerState).length;
}

function calculateMigrationEfficiency(changesCount: number, stateComplexityDelta: number): number {
  if (changesCount === 0) return 0;
  return stateComplexityDelta / changesCount;
}

function assessMigrationRisk(changesCount: number, stateComplexityDelta: number, attemptCount: number): MigratedState['riskAssessment'] {
  const factors: string[] = [];
  let level: 'low' | 'medium' | 'high' = 'low';

  if (changesCount > 5) {
    factors.push('high number of changes');
    level = 'medium';
  }
  if (stateComplexityDelta > 20) {
    factors.push('significant state complexity change');
    level = 'high';
  }
  if (attemptCount > 2) {
    factors.push('multiple migration attempts');
    level = 'high';
  }

  return { level, factors };
}
