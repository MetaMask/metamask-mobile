import type { TransactionMeta } from '@metamask/transaction-controller';
import type {
  TrackingStrategy,
  SignedEventClassifier,
  StrategyEventResult,
  StrategyConfig,
} from './tracking-strategy';

/**
 * Sequential tracking strategy (non-STX fallback). No batch concept — each tx
 * is tracked individually. All events are accepted and delegated to classifyFn.
 */
export function createSequentialTrackingStrategy(
  config: StrategyConfig,
): TrackingStrategy {
  const trackedTxIds = new Set<string>();
  let lastSeenGeneration = 0;

  return {
    checkRetryGeneration(retryGeneration: number | undefined): boolean {
      if (retryGeneration === undefined) return false;
      if (retryGeneration === lastSeenGeneration) return false;
      lastSeenGeneration = retryGeneration;
      trackedTxIds.clear();
      return true;
    },

    processStatusUpdated(
      meta: TransactionMeta,
      classifyFn: SignedEventClassifier,
    ): StrategyEventResult {
      trackedTxIds.add(meta.id);
      return classifyFn(meta);
    },

    processRejected(
      meta: TransactionMeta,
      classifyFn: SignedEventClassifier,
    ): StrategyEventResult {
      trackedTxIds.add(meta.id);
      return classifyFn(meta);
    },

    processFinished(
      meta: TransactionMeta,
      classifyFn: SignedEventClassifier,
    ): StrategyEventResult {
      trackedTxIds.add(meta.id);
      return classifyFn(meta);
    },

    getTrackedTxIds(): Set<string> {
      return new Set(trackedTxIds);
    },

    isFromCurrentBatch(_batchId: string | undefined): boolean {
      return true; // No batch concept — all accepted
    },

    isStaleBatch(_batchId: string): boolean {
      return false; // No batch concept — nothing stale
    },

    reset(): void {
      trackedTxIds.clear();
    },

    cancelReset(): void {
      trackedTxIds.clear();
    },
  };
}
