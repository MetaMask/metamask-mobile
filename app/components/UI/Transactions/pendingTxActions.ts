import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import { hasGasFeeTokenSelected } from '../../Views/confirmations/utils/transaction';

type TransactionMetaWithSmartTransaction = TransactionMeta & {
  isSmartTransaction?: boolean;
};

export interface PendingTxActionVisibility {
  /** Standard speed-up + cancel buttons (non-hardware, or submitted). */
  showSpeedUpCancel: boolean;
  /** "Sign with Keystone" + cancel, for an unsigned QR-hardware tx. */
  showQRSign: boolean;
  /** "Sign with Ledger", for an unsigned Ledger tx. */
  showLedgerSign: boolean;
}

/**
 * Visibility of the pending-transaction speed-up / cancel (and hardware-wallet
 * sign) actions. Single source of truth shared by the activity list row and the
 * transaction details screen. Gating mirrors the legacy
 * `TransactionElement.renderTxElement` / details `renderTxActions`.
 */
export function getPendingTxActionVisibility(
  tx: TransactionMeta,
  {
    isQRHardwareAccount,
    isLedgerAccount,
  }: { isQRHardwareAccount: boolean; isLedgerAccount: boolean },
): PendingTxActionVisibility {
  const { status, type } = tx;
  const isSmartTransaction = (tx as TransactionMetaWithSmartTransaction)
    .isSmartTransaction;
  const isBridgeTransaction = type === TransactionType.bridge;

  const showSpeedUpCancel =
    (status === 'submitted' ||
      (status === 'approved' && !isQRHardwareAccount && !isLedgerAccount)) &&
    !isSmartTransaction &&
    !isBridgeTransaction &&
    !hasGasFeeTokenSelected(tx);
  const showQRSign = status === 'approved' && isQRHardwareAccount;
  const showLedgerSign = status === 'approved' && isLedgerAccount;

  return { showSpeedUpCancel, showQRSign, showLedgerSign };
}

/** Whether any pending action is visible for the transaction. */
export function hasAnyPendingTxAction(
  visibility: PendingTxActionVisibility,
): boolean {
  return (
    visibility.showSpeedUpCancel ||
    visibility.showQRSign ||
    visibility.showLedgerSign
  );
}
