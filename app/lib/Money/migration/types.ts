import type { Hex } from '@metamask/utils';

/** Local resume cursor phases (ADR 0007). Empty cursor = no `phase`. */
export type MigrationPhase =
  | 'CONSENTED'
  | 'TORN_DOWN'
  | 'BATCH_SUBMITTED'
  | 'BATCH_EXECUTED'
  | 'RESIDUAL_SIGNED'
  | 'REPROVISIONING';

/** Auto-restore TORN_DOWN with no exitBatchId after this timeout. */
export const AUTO_RESTORE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Device-local resume cursor. Do not persist inventory, residual blob, or lock id. */
export interface MigrationCursor {
  phase: MigrationPhase | null;
  oldAddress: Hex | null;
  newAddress: Hex | null;
  chainId: Hex | null;
  planHash: string | null;
  cardWasLinked: boolean;
  /** ADR 0007 `txHash`: on mobile the durable handle is the TransactionController batch id. */
  exitBatchId: Hex | null;
  updatedAt: number | null;
}

/** Survives cursor clear. Marks `oldAddress` migrated and points Money at `newAddress`. */
export interface MigratedMoneyAccount {
  newAddress: Hex;
  migratedAt: number;
}

export const EMPTY_CURSOR: MigrationCursor = {
  phase: null,
  oldAddress: null,
  newAddress: null,
  chainId: null,
  planHash: null,
  cardWasLinked: false,
  exitBatchId: null,
  updatedAt: null,
};

export type MigrationBlockerKind =
  | 'pending-money-tx'
  | 'in-flight-mm-pay'
  | 'in-flight-card-spend'
  | 'insufficient-gas'
  | 'source-not-7702'
  | 'atomic-batch-unsupported'
  | 'unsupported-delegator-impl';

export interface MigrationBlocker {
  kind: MigrationBlockerKind;
}

/** Live inventory. Recheck after consent; do not persist. Amounts are wei strings. */
export interface MigrationInventory {
  source: Hex;
  destination: Hex;
  chainId: Hex;
  vmUsd: string;
  musd: string;
  nativeWei: string;
  vaultAllowance: string;
  cardAllowance: string;
  chompIntentHashes: Hex[];
  chompDelegationHashes: Hex[];
  cardLinked: boolean;
}

export interface MigrateParams {
  source: Hex;
  destination: Hex;
}
