import {
  TransactionType,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import NotificationManager from '../../../../NotificationManager';
import { REDESIGNED_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/constants/confirmations';

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
