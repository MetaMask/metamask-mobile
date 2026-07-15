import {
  type TransactionMeta,
  TransactionStatus,
} from '@metamask/transaction-controller';
import {
  type TrackingStrategy,
  type SignedEventClassifier,
  type StrategyEventResult,
  type StrategyConfig,
  NO_ACTION,
} from './tracking-strategy';

/**
 * Batch-tracking strategy for STX mode. Owns batch state internally.
 *
 * currentBatchId states:
 * undefined → initial (accept all)
 * null      → retry pending (block stale, accept new)
 * "batch-x" → locked (only accept matching)
 */
export function createBatchTrackingStrategy(
  config: StrategyConfig,
): TrackingStrategy {
  // ── Private state (owned by the strategy) ─────────────────────
  let currentBatchId: string | null | undefined;
  let seenBatchIds: Set<string> = new Set();
  let staleBatchIds: Set<string> = new Set();
  let trackedTxIds: Set<string> = new Set();
  let lastSeenGeneration = 0;

  // ── Helpers ───────────────────────────────────────────────────

  function shouldIgnoreBatchEvent(meta: TransactionMeta): boolean {
    const batchId = meta.batchId;

    if (currentBatchId === undefined) return false; // Initial: accept all
    if (currentBatchId === null) {
      if (batchId && staleBatchIds.has(batchId)) return true;
      return false;
    }
    if (batchId && staleBatchIds.has(batchId)) return true;
    if (batchId && batchId !== currentBatchId) return true;
    return false;
  }

  // ── Interface ─────────────────────────────────────────────────

  return {
    checkRetryGeneration(retryGeneration: number | undefined): boolean {
      if (retryGeneration === undefined) return false;
      if (retryGeneration === lastSeenGeneration) return false;

      lastSeenGeneration = retryGeneration;
      for (const id of seenBatchIds) {
        staleBatchIds.add(id);
      }
      seenBatchIds = new Set();
      trackedTxIds = new Set();
      currentBatchId = null;
      return true;
    },

    processStatusUpdated(
      meta: TransactionMeta,
      classifyFn: SignedEventClassifier,
    ): StrategyEventResult {
      const batchId = meta.batchId;

      // Track all seen txs/batches
      trackedTxIds.add(meta.id);
      if (batchId) seenBatchIds.add(batchId);

      // 3-state batch locking (signed/approved events)
      if (
        meta.status === TransactionStatus.signed ||
        meta.status === TransactionStatus.approved
      ) {
        if (currentBatchId === undefined) {
          currentBatchId = batchId ?? undefined;
        } else if (currentBatchId === null) {
          if (batchId && staleBatchIds.has(batchId)) {
            return NO_ACTION;
          }
          currentBatchId = batchId ?? undefined;
        } else if (batchId && batchId !== currentBatchId) {
          return NO_ACTION;
        }
      }

      // Delegate classification to the flow-specific callback
      return classifyFn(meta);
    },

    processRejected(
      meta: TransactionMeta,
      classifyFn: SignedEventClassifier,
    ): StrategyEventResult {
      trackedTxIds.add(meta.id);
      if (meta.batchId) seenBatchIds.add(meta.batchId);

      if (shouldIgnoreBatchEvent(meta)) {
        return NO_ACTION;
      }

      return classifyFn(meta);
    },

    processFinished(
      meta: TransactionMeta,
      classifyFn: SignedEventClassifier,
    ): StrategyEventResult {
      trackedTxIds.add(meta.id);
      if (meta.batchId) seenBatchIds.add(meta.batchId);

      if (shouldIgnoreBatchEvent(meta)) {
        return NO_ACTION;
      }

      return classifyFn(meta);
    },

    getTrackedTxIds(): Set<string> {
      return new Set(trackedTxIds);
    },

    isFromCurrentBatch(batchId: string | undefined): boolean {
      if (currentBatchId === undefined) return true;
      if (currentBatchId === null)
        return batchId ? !staleBatchIds.has(batchId) : false;
      return batchId === currentBatchId;
    },

    isStaleBatch(batchId: string): boolean {
      return staleBatchIds.has(batchId);
    },

    reset(): void {
      currentBatchId = undefined;
      seenBatchIds = new Set();
      staleBatchIds = new Set();
      trackedTxIds = new Set();
    },

    cancelReset(): void {
      for (const id of seenBatchIds) {
        staleBatchIds.add(id);
      }
      if (currentBatchId) {
        staleBatchIds.add(currentBatchId);
      }
      seenBatchIds = new Set();
      trackedTxIds = new Set();
      currentBatchId = null; // Retry-pending: blocks unbatched + stale events
    },
  };
}
