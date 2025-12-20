import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { useParams } from '../../../../../util/navigation/navUtils';
import { FULL_SCREEN_CONFIRMATIONS } from '../../constants/confirmations';
import { useIsInternalConfirmation } from '../transactions/useIsInternalConfirmation';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../useApprovalRequest';
import { hasTransactionType } from '../../utils/transaction';

const getIsFullScreenConfirmation = (
  approvalRequest: ApprovalRequest<TransactionMeta> | undefined,
  transactionMetadata: TransactionMeta | undefined,
  isWalletInitiated: boolean,
  maxValueMode = false,
): boolean => {
  if (!isWalletInitiated) {
    return false;
  }

  // TODO: Consider creating array of constants for this (similar to FULL_SCREEN_CONFIRMATIONS) instead of checking for musdConversion specifically.
  // Max mode mUSD conversion should render as bottom sheet
  if (
    maxValueMode &&
    transactionMetadata?.type === TransactionType.musdConversion
  ) {
    return false;
  }

  if (
    approvalRequest?.type === ApprovalType.Transaction &&
    transactionMetadata
  ) {
    return hasTransactionType(transactionMetadata, FULL_SCREEN_CONFIRMATIONS);
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
  const { maxValueMode } = useParams<{ maxValueMode?: boolean }>();

  const isFullScreenConfirmation = getIsFullScreenConfirmation(
    approvalRequest,
    transactionMetadata,
    isInternalConfirmation,
    maxValueMode,
  );

  return { isFullScreenConfirmation };
};
