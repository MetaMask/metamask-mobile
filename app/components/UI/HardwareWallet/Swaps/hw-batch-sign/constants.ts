import {
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import type { HardwareWalletOperationType } from '../../../../../core/HardwareWallet';

export const HARDWARE_WALLET_OPERATION_TRANSACTION: HardwareWalletOperationType =
  'transaction';

export const BATCH_CANCELLED_ERROR = 'Batch cancelled';

export const APPROVAL_TYPES: Set<TransactionType> = new Set([
  TransactionType.bridgeApproval,
  TransactionType.swapApproval,
]);

export const TRADE_TYPES: Set<TransactionType> = new Set([
  TransactionType.bridge,
  TransactionType.swap,
]);

export const ALL_BATCH_TYPES: Set<TransactionType> = new Set([
  ...APPROVAL_TYPES,
  ...TRADE_TYPES,
]);

// Send-mode tracked types (flow === 'send'). Fungible-only.
export const SEND_TYPES: Set<TransactionType> = new Set([
  TransactionType.simpleSend,
  TransactionType.tokenMethodTransfer,
  // FeeTransfer (gas payment) is typed `gasPayment` by useGasFeeToken.
  TransactionType.gasPayment,
]);

export const NON_TERMINAL_CANCEL_STATUSES: ReadonlySet<TransactionStatus> =
  new Set([
    TransactionStatus.approved,
    TransactionStatus.signed,
    TransactionStatus.submitted,
  ]);

// Submitted txs are included above for cancel bookkeeping, but must not be
// locally aborted or dropped because they may still be pending on-chain.
export const LOCALLY_DROPPABLE_CANCEL_STATUSES: ReadonlySet<TransactionStatus> =
  new Set([TransactionStatus.approved, TransactionStatus.signed]);

export const TERMINAL_CANCEL_STATUSES: ReadonlySet<TransactionStatus> = new Set(
  [
    TransactionStatus.failed,
    TransactionStatus.rejected,
    TransactionStatus.submitted,
    TransactionStatus.confirmed,
    TransactionStatus.dropped,
  ],
);

export const FAILED_OR_REJECTED_STATUSES: ReadonlySet<TransactionStatus> =
  new Set([TransactionStatus.failed, TransactionStatus.rejected]);

export const TX_STATUS_UPDATED_EVENT =
  'TransactionController:transactionStatusUpdated';
export const CANCEL_TERMINAL_WAIT_TIMEOUT_MS = 30_000;
export const DEVICE_NOT_READY_RETRY_DELAY_MS = 1_000;

export const POST_SIGN_BATCH_STATUSES: ReadonlySet<TransactionStatus> = new Set(
  [
    TransactionStatus.signed,
    TransactionStatus.submitted,
    TransactionStatus.confirmed,
  ],
);
