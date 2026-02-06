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
import { hasTransactionType } from '../../utils/transaction';
import { MusdConversionIntent } from '../../../../UI/Earn/hooks/useMusdConversion';
import { useParams } from '../../../../../util/navigation/navUtils';

const getIsFullScreenConfirmation = (
  approvalRequest: ApprovalRequest<TransactionMeta> | undefined,
  transactionMetadata: TransactionMeta | undefined,
  isWalletInitiated: boolean,
  conversionIntent: MusdConversionIntent,
): boolean => {
  if (!isWalletInitiated) {
    return false;
  }

  // Max mode mUSD conversion should render as bottom sheet
  if (
    conversionIntent === MusdConversionIntent.Max &&
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
  const { conversionIntent } = useParams<{
    conversionIntent: MusdConversionIntent;
  }>();

  const isFullScreenConfirmation = getIsFullScreenConfirmation(
    approvalRequest,
    transactionMetadata,
    isInternalConfirmation,
    conversionIntent,
  );

  return { isFullScreenConfirmation };
};
