import {
  TransactionType,
  TransactionStatus,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import NotificationManager from '../../../../NotificationManager';
import { CONFIRMATION_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/constants/confirmations';

export function handleShowNotification(transactionMeta: TransactionMeta) {
  const { status } = transactionMeta;
  if (
    CONFIRMATION_TRANSACTION_TYPES.includes(
      transactionMeta.type as TransactionType,
    ) &&
    status !== TransactionStatus.failed
  ) {
    NotificationManager.watchSubmittedTransaction(transactionMeta);
  }
}
