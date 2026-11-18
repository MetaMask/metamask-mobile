import { providerErrors } from '@metamask/rpc-errors';
import {
  TransactionStatus,
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type {
  PredictFundingPlan,
  PredictHex,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import type { SubmittedDepositTransfer } from './depositTransferExecutor';
import { decodeUsdcTransfer, toUsdcBaseUnits } from './usdcTransfer';

const TERMINAL_FAILURE_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  TransactionStatus.failed,
  TransactionStatus.rejected,
  TransactionStatus.dropped,
]);

const SUBMITTED_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  TransactionStatus.submitted,
  TransactionStatus.confirmed,
]);

const PENDING_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  TransactionStatus.unapproved,
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
]);

const ACTIVE_STATUSES: ReadonlySet<TransactionStatus> = new Set([
  ...SUBMITTED_STATUSES,
  ...PENDING_STATUSES,
]);

const TX_HASH = /^0x[0-9a-fA-F]{64}$/u;

const isValidTxHash = (hash: unknown): hash is PredictHex =>
  typeof hash === 'string' && TX_HASH.test(hash);

const readChainId = (chainId: string | undefined): number | undefined => {
  if (typeof chainId !== 'string') {
    return undefined;
  }
  const parsed = Number.parseInt(chainId, 16);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const isZeroNativeValue = (value: string | undefined): boolean => {
  if (value === undefined || value === '') {
    return true;
  }
  try {
    return BigInt(value) === BigInt(0);
  } catch {
    return false;
  }
};

export type ExistingDepositTransfer =
  | { kind: 'submitted'; transfer: SubmittedDepositTransfer }
  | {
      kind: 'pending';
      status: TransactionStatus;
      /** Resolves with the submitted transfer once broadcast, or rejects on rejection or failure. */
      wait: () => Promise<SubmittedDepositTransfer>;
    };

export type MatchedDepositTransaction =
  | { kind: 'submitted'; transfer: SubmittedDepositTransfer }
  | { kind: 'pending'; transactionMeta: TransactionMeta };

export interface FindMatchingDepositTransactionParams {
  transactions: readonly TransactionMeta[];
  from: PredictHex;
  plan: PredictFundingPlan;
  createdAt: PredictTimestamp;
}

const rankCandidate = (tx: TransactionMeta): number => {
  if (tx.status === TransactionStatus.confirmed && isValidTxHash(tx.hash)) {
    return 4;
  }
  if (tx.status === TransactionStatus.submitted && isValidTxHash(tx.hash)) {
    return 3;
  }
  if (
    tx.status === TransactionStatus.submitted ||
    tx.status === TransactionStatus.signed ||
    tx.status === TransactionStatus.approved
  ) {
    return 2;
  }
  if (tx.status === TransactionStatus.unapproved) {
    return 1;
  }
  return 0;
};

const matchesDepositTransaction = (
  tx: TransactionMeta,
  {
    from,
    plan,
    createdAtMs,
    expectedBaseUnits,
  }: {
    from: PredictHex;
    plan: PredictFundingPlan;
    createdAtMs: number;
    expectedBaseUnits: bigint;
  },
): boolean => {
  if (!ACTIVE_STATUSES.has(tx.status)) {
    return false;
  }
  if (
    tx.type !== undefined &&
    tx.type !== TransactionType.tokenMethodTransfer
  ) {
    return false;
  }
  if (readChainId(tx.chainId) !== plan.chainId) {
    return false;
  }
  if (tx.txParams?.from?.toLowerCase() !== from.toLowerCase()) {
    return false;
  }
  if (tx.txParams?.to?.toLowerCase() !== plan.tokenContract.toLowerCase()) {
    return false;
  }
  if (!isZeroNativeValue(tx.txParams?.value)) {
    return false;
  }
  const decoded = decodeUsdcTransfer(tx.txParams?.data);
  if (
    !decoded ||
    decoded.recipient !== plan.depositAddress.toLowerCase() ||
    decoded.baseUnits !== expectedBaseUnits
  ) {
    return false;
  }
  if (!Number.isNaN(createdAtMs)) {
    if (typeof tx.time !== 'number' || tx.time < createdAtMs) {
      return false;
    }
  }
  return true;
};

/**
 * Finds an existing non-failed wallet transaction scoped to the deposit's
 * sender, chain, token contract, recipient, exact USDC amount, and creation
 * time. Prefers already-submitted/confirmed transactions with a hash over
 * pending transactions.
 */
export const findMatchingDepositTransaction = ({
  transactions,
  from,
  plan,
  createdAt,
}: FindMatchingDepositTransactionParams):
  | MatchedDepositTransaction
  | undefined => {
  const expectedBaseUnits = toUsdcBaseUnits(plan.amount);
  if (expectedBaseUnits === undefined) {
    return undefined;
  }
  const createdAtMs = Date.parse(createdAt);

  let best: TransactionMeta | undefined;
  let bestRank = 0;

  for (const tx of transactions) {
    if (
      !matchesDepositTransaction(tx, {
        from,
        plan,
        createdAtMs,
        expectedBaseUnits,
      })
    ) {
      continue;
    }
    const rank = rankCandidate(tx);
    if (rank === 0) {
      continue;
    }
    if (
      !best ||
      rank > bestRank ||
      (rank === bestRank && (tx.time ?? 0) > (best.time ?? 0))
    ) {
      best = tx;
      bestRank = rank;
    }
  }

  if (!best) {
    return undefined;
  }
  if (SUBMITTED_STATUSES.has(best.status) && isValidTxHash(best.hash)) {
    return {
      kind: 'submitted',
      transfer: {
        txHash: best.hash,
        chainId: readChainId(best.chainId) ?? plan.chainId,
        to: best.txParams?.to,
        data: best.txParams?.data,
      },
    };
  }
  return { kind: 'pending', transactionMeta: best };
};

/** Whether the wallet already knows `txHash` ended in failure, rejection, or drop. */
export const isKnownFailedDepositHash = (
  transactions: readonly TransactionMeta[],
  txHash: PredictHex,
): boolean =>
  transactions.some(
    (tx) =>
      tx.hash?.toLowerCase() === txHash.toLowerCase() &&
      TERMINAL_FAILURE_STATUSES.has(tx.status),
  );

type TransactionStateChangeHandler = (state: {
  transactions?: TransactionMeta[];
}) => void;
type TransactionPayloadHandler = (payload: {
  transactionMeta: TransactionMeta;
}) => void;
type TransactionConfirmedHandler = (transactionMeta: TransactionMeta) => void;

export interface DepositTransactionMessenger {
  subscribe(
    event: 'TransactionController:stateChange',
    handler: TransactionStateChangeHandler,
  ): void;
  subscribe(
    event:
      | 'TransactionController:transactionSubmitted'
      | 'TransactionController:transactionFailed'
      | 'TransactionController:transactionRejected'
      | 'TransactionController:transactionDropped',
    handler: TransactionPayloadHandler,
  ): void;
  subscribe(
    event: 'TransactionController:transactionConfirmed',
    handler: TransactionConfirmedHandler,
  ): void;
  unsubscribe(
    event: 'TransactionController:stateChange',
    handler: TransactionStateChangeHandler,
  ): void;
  unsubscribe(
    event:
      | 'TransactionController:transactionSubmitted'
      | 'TransactionController:transactionFailed'
      | 'TransactionController:transactionRejected'
      | 'TransactionController:transactionDropped',
    handler: TransactionPayloadHandler,
  ): void;
  unsubscribe(
    event: 'TransactionController:transactionConfirmed',
    handler: TransactionConfirmedHandler,
  ): void;
}

export interface WaitForPendingDepositTransactionOptions {
  txId: string;
  fallbackChainId: number;
  shouldPresentConfirmation: boolean;
  presentConfirmation: () => void;
  getTransaction: (id: string) => TransactionMeta | undefined;
  messenger: DepositTransactionMessenger;
}

/**
 * Waits for an existing pending wallet transaction (`unapproved`, `approved`,
 * `signed`, or `submitted` without a hash yet) to obtain a hash or terminate.
 * Presents the confirmation sheet when the transaction is still `unapproved`.
 */
export const waitForPendingDepositTransaction = ({
  txId,
  fallbackChainId,
  shouldPresentConfirmation,
  presentConfirmation,
  getTransaction,
  messenger,
}: WaitForPendingDepositTransactionOptions): Promise<SubmittedDepositTransfer> =>
  new Promise((resolve, reject) => {
    let settled = false;

    let cleanup = (): void => undefined;

    const finishResolve = (transfer: SubmittedDepositTransfer): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(transfer);
    };

    const finishReject = (error: unknown): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(error);
    };

    const toSubmitted = (
      tx: TransactionMeta,
    ): SubmittedDepositTransfer | null =>
      SUBMITTED_STATUSES.has(tx.status) && isValidTxHash(tx.hash)
        ? {
            txHash: tx.hash,
            chainId: readChainId(tx.chainId) ?? fallbackChainId,
            to: tx.txParams?.to,
            data: tx.txParams?.data,
          }
        : null;

    const inspect = (candidate?: TransactionMeta): void => {
      if (settled) {
        return;
      }
      const tx = candidate ?? getTransaction(txId);
      if (!tx) {
        finishReject(new Error('Pending deposit transaction was removed'));
        return;
      }
      if (tx.status === TransactionStatus.rejected) {
        finishReject(providerErrors.userRejectedRequest());
        return;
      }
      if (TERMINAL_FAILURE_STATUSES.has(tx.status)) {
        finishReject(new Error(`Deposit transaction ${tx.status}`));
        return;
      }
      const submitted = toSubmitted(tx);
      if (submitted) {
        finishResolve(submitted);
      }
    };

    const onStateChange: TransactionStateChangeHandler = (state) => {
      inspect(state.transactions?.find((tx) => tx.id === txId));
    };

    const onSubmitted: TransactionPayloadHandler = ({ transactionMeta }) => {
      if (transactionMeta.id !== txId) {
        return;
      }
      if (isValidTxHash(transactionMeta.hash)) {
        finishResolve({
          txHash: transactionMeta.hash,
          chainId: readChainId(transactionMeta.chainId) ?? fallbackChainId,
          to: transactionMeta.txParams?.to,
          data: transactionMeta.txParams?.data,
        });
        return;
      }
      inspect(transactionMeta);
    };

    const onConfirmed: TransactionConfirmedHandler = (transactionMeta) => {
      if (transactionMeta.id !== txId) {
        return;
      }
      if (isValidTxHash(transactionMeta.hash)) {
        finishResolve({
          txHash: transactionMeta.hash,
          chainId: readChainId(transactionMeta.chainId) ?? fallbackChainId,
          to: transactionMeta.txParams?.to,
          data: transactionMeta.txParams?.data,
        });
        return;
      }
      inspect(transactionMeta);
    };

    const onRejected: TransactionPayloadHandler = ({ transactionMeta }) => {
      if (transactionMeta.id === txId) {
        finishReject(providerErrors.userRejectedRequest());
      }
    };

    const onFailed: TransactionPayloadHandler = ({ transactionMeta }) => {
      if (transactionMeta.id === txId) {
        finishReject(new Error('Deposit transaction failed'));
      }
    };

    const onDropped: TransactionPayloadHandler = ({ transactionMeta }) => {
      if (transactionMeta.id === txId) {
        finishReject(new Error('Deposit transaction dropped'));
      }
    };

    cleanup = () => {
      messenger.unsubscribe('TransactionController:stateChange', onStateChange);
      messenger.unsubscribe(
        'TransactionController:transactionSubmitted',
        onSubmitted,
      );
      messenger.unsubscribe(
        'TransactionController:transactionConfirmed',
        onConfirmed,
      );
      messenger.unsubscribe(
        'TransactionController:transactionRejected',
        onRejected,
      );
      messenger.unsubscribe(
        'TransactionController:transactionFailed',
        onFailed,
      );
      messenger.unsubscribe(
        'TransactionController:transactionDropped',
        onDropped,
      );
    };

    messenger.subscribe('TransactionController:stateChange', onStateChange);
    messenger.subscribe(
      'TransactionController:transactionSubmitted',
      onSubmitted,
    );
    messenger.subscribe(
      'TransactionController:transactionConfirmed',
      onConfirmed,
    );
    messenger.subscribe(
      'TransactionController:transactionRejected',
      onRejected,
    );
    messenger.subscribe('TransactionController:transactionFailed', onFailed);
    messenger.subscribe('TransactionController:transactionDropped', onDropped);

    inspect();
    if (!settled && shouldPresentConfirmation) {
      presentConfirmation();
    }
  });

export interface SessionDepositTransferKey {
  venueId: PredictVenueId;
  operationId: string;
  from: PredictHex;
  plan: PredictFundingPlan;
}

interface SessionTransferEntry {
  venueId: PredictVenueId;
  from: string;
  operationId: string;
  transfer: SubmittedDepositTransfer;
}

const sessionDepositTransfers = new Map<string, SessionTransferEntry>();

const sessionTransferKey = ({
  venueId,
  operationId,
  from,
  plan,
}: SessionDepositTransferKey): string => {
  const baseUnits = toUsdcBaseUnits(plan.amount)?.toString() ?? plan.amount;
  return [
    venueId,
    from.toLowerCase(),
    operationId,
    plan.chainId,
    plan.tokenContract.toLowerCase(),
    plan.depositAddress.toLowerCase(),
    baseUnits,
  ].join(':');
};

/** Records a submitted transfer in memory until its report or cancel succeeds. */
export const recordSessionDepositTransfer = (
  key: SessionDepositTransferKey,
  transfer: SubmittedDepositTransfer,
): void => {
  sessionDepositTransfers.set(sessionTransferKey(key), {
    venueId: key.venueId,
    from: key.from.toLowerCase(),
    operationId: key.operationId,
    transfer,
  });
};

/** Reads an in-session submitted transfer for the deposit, identity, and plan. */
export const getSessionDepositTransfer = (
  key: SessionDepositTransferKey,
): SubmittedDepositTransfer | undefined =>
  sessionDepositTransfers.get(sessionTransferKey(key))?.transfer;

/** Removes the recorded transfer once reported to the backend. */
export const clearSessionDepositTransfer = (
  key: SessionDepositTransferKey,
): void => {
  sessionDepositTransfers.delete(sessionTransferKey(key));
};

/** Removes any recorded transfers for one deposit operation and identity. */
export const clearSessionDepositTransfersForOperation = ({
  venueId,
  from,
  operationId,
}: {
  venueId: PredictVenueId;
  from: PredictHex;
  operationId: string;
}): void => {
  const normalizedFrom = from.toLowerCase();
  for (const [key, entry] of sessionDepositTransfers) {
    if (
      entry.venueId === venueId &&
      entry.from === normalizedFrom &&
      entry.operationId === operationId
    ) {
      sessionDepositTransfers.delete(key);
    }
  }
};

/** Clears all recorded session deposit transfers (or those for one venue). */
export const clearAllSessionDepositTransfers = (
  venueId?: PredictVenueId,
): void => {
  if (venueId === undefined) {
    sessionDepositTransfers.clear();
    return;
  }
  for (const [key, entry] of sessionDepositTransfers) {
    if (entry.venueId === venueId) {
      sessionDepositTransfers.delete(key);
    }
  }
};
