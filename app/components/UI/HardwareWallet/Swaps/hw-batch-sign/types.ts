import type { TransactionType } from '@metamask/transaction-controller';
import type { useDispatch } from 'react-redux';
import type { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import type { useHardwareWallet } from '../../../../../core/HardwareWallet';
import type { Flow } from '../flowStrategy';

/** Options for {@link useHwBatchSignTracker}. */
export interface UseHwBatchSignTrackerOptions {
  fromAddress: string | undefined;
  isEnabled: boolean;
  retryGenerationRef?: React.RefObject<number>;
  /** Signing-session origin. `Flow.Send` activates send-mode; defaults to `Flow.Bridge`. */
  flow?: Flow;
  /** Sendbundle only: gas-fee-token address for the `FeeTransfer` step. */
  gasTokenAddress?: string;
  /** Send only: original confirmation approval consumed by submit, not by the tracker. */
  deferredApprovalRequestId?: string;
  /** Sendbundle only: number of child txs expected in the TransactionBatch approval. */
  expectedBatchTransactionCount?: number;
}

/**
 * Hook-local signing-orchestration state. Batch-tracking state
 * (currentBatchId, seenBatchIds, staleBatchIds, batchGeneration,
 * lastSeenGeneration) is OWNED by the TrackingStrategy, not here.
 */
export interface HwBatchSignTrackerState {
  signedBatchIds: Set<string>;
  pendingSignTxIds: Set<string>;
  pendingAbortTxIds: Set<string>;
  acceptedApprovalIds: Set<string>;
  approvalQueue: string[];
  handledTxIds: Set<string>;
  signingDispatchedTxIds: Set<string>;
  sendTransactionStepIndexes: Map<string, number>;
  isProcessingQueue: boolean;
  isCancellingBatch: boolean;
}

export interface HwBatchSignTrackerLatestValues {
  fromAddress: string | undefined;
  /** Active tracked-types set; read by `cancelCurrentBatch` (outside the effect). */
  trackedTypes: Set<TransactionType>;
  /** Case-normalized gas-token address for send-mode; undefined in bridge mode. */
  normalizedGasTokenAddress: string | undefined;
  dispatch: ReturnType<typeof useDispatch>;
  trackEvent: ReturnType<typeof useAnalytics>['trackEvent'];
  createEventBuilder: ReturnType<typeof useAnalytics>['createEventBuilder'];
  ensureDeviceReady: ReturnType<typeof useHardwareWallet>['ensureDeviceReady'];
  setPendingOperationAddress: ReturnType<
    typeof useHardwareWallet
  >['setPendingOperationAddress'];
  showAwaitingConfirmation: ReturnType<
    typeof useHardwareWallet
  >['showAwaitingConfirmation'];
  hideAwaitingConfirmation: ReturnType<
    typeof useHardwareWallet
  >['hideAwaitingConfirmation'];
  showHardwareWalletError: ReturnType<
    typeof useHardwareWallet
  >['showHardwareWalletError'];
  isSendMode: boolean;
  deferredApprovalRequestId?: string;
  expectedBatchTransactionCount?: number;
}
