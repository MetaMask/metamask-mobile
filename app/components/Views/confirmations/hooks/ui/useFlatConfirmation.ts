import { TransactionType } from '@metamask/transaction-controller';

import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  MMM_ORIGIN,
  REDESIGNED_TRANSFER_TYPES,
  FLAT_TRANSACTION_CONFIRMATIONS,
} from '../../constants/confirmations';

export const useFlatConfirmation = () => {
  const transactionMetadata = useTransactionMetadataRequest();

  const isFlatConfirmation = FLAT_TRANSACTION_CONFIRMATIONS.includes(
    transactionMetadata?.type as TransactionType,
  );

  if (
    REDESIGNED_TRANSFER_TYPES.includes(
      transactionMetadata?.type as TransactionType,
    ) &&
    transactionMetadata?.origin === MMM_ORIGIN
  ) {
    return { isFlatConfirmation: true };
  }

  return { isFlatConfirmation };
};
