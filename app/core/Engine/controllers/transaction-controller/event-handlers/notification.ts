import {
  TransactionType,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import NotificationManager from '../../../../NotificationManager';
import { REDESIGNED_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/constants/confirmations';
import { strings } from '../../../../../../locales/i18n';

export function handleShowSolanaPayStatusNotification(
  transactionMeta: TransactionMeta,
) {
  if (transactionMeta.metamaskPay?.intent?.outcome?.type !== 'unknown') {
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
