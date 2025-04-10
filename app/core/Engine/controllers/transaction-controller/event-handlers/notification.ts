import {
  TransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import NotificationManager from '../../../../NotificationManager';
import { REDESIGNED_TRANSACTION_TYPES } from '../../../../../components/Views/confirmations/hooks/useConfirmationRedesignEnabled';

export function handleShowNotification(transactionMeta: TransactionMeta) {
  if (
    REDESIGNED_TRANSACTION_TYPES.includes(
      transactionMeta.type as TransactionType,
    )
  ) {
    NotificationManager.watchSubmittedTransaction(transactionMeta);
  }
}
