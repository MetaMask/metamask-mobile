import type { Hex } from '@metamask/utils';

export type MigrationStatus =
  | 'IDLE'
  | 'INVENTORIED'
  | 'TORN_DOWN'
  | 'BATCH_EXECUTED'
  | 'RE_PROVISIONED'
  | 'VERIFIED_INERT';

/** Auto-restore TORN_DOWN with no batch after this timeout. */
export const AUTO_RESTORE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type FormerMoneyAccount = {
  newAddress: Hex;
  residualDelegation: unknown | null;
  residualDelegationHash: Hex | null;
};

export type MigrationSnapshot = {
  status: MigrationStatus;
  inventory: MigrationInventory | null;
  destination: Hex | null;
  exitBatchId: Hex | null;
  residualDelegation: unknown | null;
  residualDelegationHash: Hex | null;
  tornDownAt: number | null;
  formerMoneyAccounts: Record<string, FormerMoneyAccount>;
};

export const EMPTY_SNAPSHOT: MigrationSnapshot = {
  status: 'IDLE',
  inventory: null,
  destination: null,
  exitBatchId: null,
  residualDelegation: null,
  residualDelegationHash: null,
  tornDownAt: null,
  formerMoneyAccounts: {},
};

export type MigrationStore = {
  load: () => MigrationSnapshot;
  save: (next: MigrationSnapshot) => void;
};

export type MigrationBlockerKind =
  | 'pending-money-tx'
  | 'in-flight-mm-pay'
  | 'in-flight-card-spend'
  | 'insufficient-gas'
  | 'source-not-7702'
  | 'atomic-batch-unsupported'
  | 'unsupported-delegator-impl';

export type MigrationBlocker = {
  kind: MigrationBlockerKind;
};

export type MigrationInventory = {
  source: Hex;
  destination: Hex;
  chainId: Hex;
  vmUsd: bigint;
  musd: bigint;
  nativeWei: bigint;
  vaultAllowance: bigint;
  cardAllowance: bigint;
  chompIntentHashes: Hex[];
  chompDelegationHashes: Hex[];
  cardLinked: boolean;
};

export type MigrateParams = {
  source: Hex;
  destination: Hex;
};
