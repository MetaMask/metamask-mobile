import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import { TransactionMeta } from '@metamask/transaction-controller';
import {
  FORCE_BOTTOM_SHEET_BY_VARIANT,
  FULL_SCREEN_CONFIRMATIONS,
} from '../../constants/confirmations';
import { useIsInternalConfirmation } from '../transactions/useIsInternalConfirmation';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../useApprovalRequest';
import { hasTransactionType } from '../../utils/transaction';
import { useParams } from '../../../../../util/navigation/navUtils';

const getIsFullScreenConfirmation = (
  approvalRequest: ApprovalRequest<TransactionMeta> | undefined,
  transactionMetadata: TransactionMeta | undefined,
  isWalletInitiated: boolean,
  variant?: string,
): boolean => {
  if (!isWalletInitiated) {
    return false;
  }

  if (approvalRequest?.type === ApprovalType.TransactionBatch) {
    return true;
  }

  if (
    approvalRequest?.type !== ApprovalType.Transaction ||
    !transactionMetadata?.type
  ) {
    return false;
  }

  if (
    variant &&
    FORCE_BOTTOM_SHEET_BY_VARIANT[transactionMetadata.type]?.[variant] === true
  ) {
    return false;
  }

  return hasTransactionType(transactionMetadata, FULL_SCREEN_CONFIRMATIONS);
};

export const useFullScreenConfirmation = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const isInternalConfirmation = useIsInternalConfirmation();
  const { variant } = useParams<{ variant?: string }>();

  const isFullScreenConfirmation = getIsFullScreenConfirmation(
    approvalRequest,
    transactionMetadata,
    isInternalConfirmation,
    variant,
  );

  return { isFullScreenConfirmation };
};
