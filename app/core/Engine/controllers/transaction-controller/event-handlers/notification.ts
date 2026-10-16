import {
  TransactionType,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import NotificationManager from '../../../../NotificationManager';
import { REDESIGNED_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/constants/confirmations';
import { strings } from '../../../../../../locales/i18n';
import { getSolanaPayOutcome } from '../../../../../util/transactions/solana-pay';

export function handleShowSolanaPayStatusNotification(
  transactionMeta: TransactionMeta,
) {
  const execution = transactionMeta.metamaskPay?.solanaExecution;
  if (!execution || getSolanaPayOutcome(execution) !== 'unknown') {
    return;
  }

  NotificationManager.showSimpleNotification({
    title: strings('confirm.solana_pay.status_unavailable'),
    status: 'pending',
  });
}

export function handleShowNotification(transactionMeta: TransactionMeta) {
  const { status } = transactionMeta;
  if (
    REDESIGNED_TRANSACTION_TYPES.includes(
      transactionMeta.type as TransactionType,
    ) &&
    status !== TransactionStatus.failed
  ) {
    NotificationManager.watchSubmittedTransaction(transactionMeta);
  }
}
