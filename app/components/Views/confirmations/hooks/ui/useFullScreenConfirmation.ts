import { ApprovalType } from '@metamask/controller-utils';
import { TransactionType } from '@metamask/transaction-controller';
import {
  FULL_SCREEN_CONFIRMATIONS,
  MMM_ORIGIN
} from '../../constants/confirmations';
import { useTransactionBatchesMetadataRequest } from '../transactions/useTransactionBatchesMetadataRequest';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../useApprovalRequest';

export const useFullScreenConfirmation = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const transactionBatchesMetadata = useTransactionBatchesMetadataRequest();

  const isWalletInitiated = transactionMetadata?.origin === MMM_ORIGIN ||
    transactionBatchesMetadata?.origin === MMM_ORIGIN;
  let isFullScreenConfirmation = false;
  if (approvalRequest?.type === ApprovalType.Transaction) {
    if (
      FULL_SCREEN_CONFIRMATIONS.includes(
        transactionMetadata?.type as TransactionType,
      )
    ) {
      isFullScreenConfirmation = isWalletInitiated;
    }
  } else if (approvalRequest?.type === 'transaction_batch') {
    isFullScreenConfirmation = isWalletInitiated;
  }

  return { isFullScreenConfirmation };
};
