import type { TransactionMeta } from '@metamask/transaction-controller';
import type { HardwareWalletsSwapsEvent } from '../HardwareWalletsSwaps.state';

/** Result of processing an event through the strategy. */
export interface StrategyEventResult {
  /** Event to dispatch, or null to skip. */
  readonly event: HardwareWalletsSwapsEvent | null;
  /** Add this tx to pendingSignTxIds and set as confirmation tx. */
  readonly shouldTrackAsPending: boolean;
  /** Call completeTrackedTx for this tx. */
  readonly shouldCompleteTracking: boolean;
  /** Call enqueuePendingApprovals after processing. */
  readonly shouldEnqueueApprovals: boolean;
  /** Call trackTransactionCancelledEvent. */
  readonly shouldTrackCancellation: boolean;
}

/** Flow-specific classifier. Hook provides; strategy calls after batch checks pass. */
export type SignedEventClassifier = (
  transactionMeta: TransactionMeta,
) => StrategyEventResult;

export const NO_ACTION: StrategyEventResult = {
  event: null,
  shouldTrackAsPending: false,
  shouldCompleteTracking: false,
  shouldEnqueueApprovals: false,
  shouldTrackCancellation: false,
};

/**
 * Transaction tracking strategy. Owns batch-tracking state and gates events
 * on batch identity/staleness. The hook provides flow-specific classifyFn.
 *
 * Implementations: `BatchTrackingStrategy` (STX) / `SequentialTrackingStrategy` (fallback).
 */
export interface TrackingStrategy {
  /** If retry generation advanced, marks seen batches as stale and resets batch lock. */
  checkRetryGeneration(retryGeneration: number | undefined): boolean;

  /** Process a status-updated event — batch locking + stale filtering, then delegate to classifyFn. */
  processStatusUpdated(
    transactionMeta: TransactionMeta,
    classifyFn: SignedEventClassifier,
  ): StrategyEventResult;

  /** Process a rejected event — stale filtering, then delegate to classifyFn. */
  processRejected(
    transactionMeta: TransactionMeta,
    classifyFn: SignedEventClassifier,
  ): StrategyEventResult;

  /** Process a finished event — stale filtering, then delegate to classifyFn. */
  processFinished(
    transactionMeta: TransactionMeta,
    classifyFn: SignedEventClassifier,
  ): StrategyEventResult;

  /** Tracked tx ids for cancelCurrentBatch abort. */
  getTrackedTxIds(): Set<string>;

  /** Full reset — clears all batch state. */
  reset(): void;

  /** Cancel-time reset: marks seen batches as stale, sets currentBatchId to null (retry-pending). */
  cancelReset(): void;

  /** Whether batchId belongs to the locked batch. */
  isFromCurrentBatch(batchId: string | undefined): boolean;

  /** Whether batchId is stale (from a prior retry). */
  isStaleBatch(batchId: string): boolean;
}

/** Configuration passed from the hook to the strategy factory. */
export interface StrategyConfig {
  /** Lower-cased EVM address of the signing account. */
  readonly targetFrom: string;
  /** Whether send-mode is active. */
  readonly isSendMode: boolean;
  /** Send-mode only: gas-token address. */
  readonly gasTokenAddress?: string;
  /** Send-mode only: root send tx approval id. */
  readonly deferredApprovalRequestId?: string;
  /** Send-mode only: expected child-tx count. */
  readonly expectedBatchTransactionCount?: number;
}
