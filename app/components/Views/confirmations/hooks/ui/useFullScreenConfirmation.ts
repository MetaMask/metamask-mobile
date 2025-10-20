import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { FULL_SCREEN_CONFIRMATIONS } from '../../constants/confirmations';
import { useIsInternalConfirmation } from '../transactions/useIsInternalConfirmation';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../useApprovalRequest';

const getIsFullScreenConfirmation = (
  approvalRequest: ApprovalRequest<TransactionMeta> | undefined,
  transactionMetadata: TransactionMeta | undefined,
  isWalletInitiated: boolean,
): boolean => {
  if (!isWalletInitiated) {
    return false;
  }

  if (approvalRequest?.type === ApprovalType.Transaction) {
    return FULL_SCREEN_CONFIRMATIONS.includes(
      transactionMetadata?.type as TransactionType,
    );
  }

  if (approvalRequest?.type === ApprovalType.TransactionBatch) {
    return true;
  }

  return false;
};

export const useFullScreenConfirmation = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const isInternalConfirmation = useIsInternalConfirmation();

  const isFullScreenConfirmation = getIsFullScreenConfirmation(
    approvalRequest,
    transactionMetadata,
    isInternalConfirmation,
  );

  return { isFullScreenConfirmation };
};
