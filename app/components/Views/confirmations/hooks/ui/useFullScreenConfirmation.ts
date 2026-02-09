import { ApprovalRequest } from '@metamask/approval-controller';
import { ApprovalType } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  CONFIRMATION_PRESENTATION_BY_VARIANT,
  FULL_SCREEN_CONFIRMATIONS,
} from '../../constants/confirmations';
import { useIsInternalConfirmation } from '../transactions/useIsInternalConfirmation';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import useApprovalRequest from '../useApprovalRequest';
import { hasTransactionType } from '../../utils/transaction';
import { useParams } from '../../../../../util/navigation/navUtils';
import type { ConfirmationParams } from '../../components/confirm/confirm-component';

const getIsFullScreenConfirmation = (
  approvalRequest: ApprovalRequest<TransactionMeta> | undefined,
  transactionMetadata: TransactionMeta | undefined,
  isWalletInitiated: boolean,
  variant: string,
): boolean => {
  if (!isWalletInitiated) {
    return false;
  }

  if (approvalRequest?.type === ApprovalType.TransactionBatch) {
    return true;
  }

  if (
    approvalRequest?.type !== ApprovalType.Transaction ||
    !transactionMetadata
  ) {
    return false;
  }

  const transactionType = transactionMetadata.type as TransactionType;

  const presentationOverride = getPresentationOverride({
    transactionType,
    variant,
  });

  if (presentationOverride === 'bottomSheet') {
    return false;
  }

  if (presentationOverride === 'fullScreen') {
    return true;
  }

  return hasTransactionType(transactionMetadata, FULL_SCREEN_CONFIRMATIONS);
};

export const useFullScreenConfirmation = () => {
  const { approvalRequest } = useApprovalRequest();
  const transactionMetadata = useTransactionMetadataRequest();
  const isInternalConfirmation = useIsInternalConfirmation();
  const { forceBottomSheet } = useParams<ConfirmationParams>();

  const isFullScreenConfirmation = forceBottomSheet
    ? false
    : getIsFullScreenConfirmation(
        approvalRequest,
        transactionMetadata,
        isInternalConfirmation,
      );

  return { isFullScreenConfirmation };
};
