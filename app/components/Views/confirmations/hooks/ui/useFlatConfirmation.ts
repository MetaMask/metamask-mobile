import { TransactionType } from '@metamask/transaction-controller';
import {
  FLAT_TRANSACTION_CONFIRMATIONS,
  MMM_ORIGIN,
  REDESIGNED_TRANSFER_TYPES,
} from '../../constants/confirmations';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../useApprovalRequest';
import { ApprovalType } from '@metamask/controller-utils';

export const useFlatConfirmation = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();

  let isFlatConfirmation = false;
  if (approvalRequest?.type === ApprovalType.Transaction) {
    isFlatConfirmation = FLAT_TRANSACTION_CONFIRMATIONS.includes(
      transactionMetadata?.type as TransactionType,
    );
  } else if (approvalRequest?.type === 'transaction_batch') {
    // We don't discern between transaction batch yet
    isFlatConfirmation = true;
  }

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
