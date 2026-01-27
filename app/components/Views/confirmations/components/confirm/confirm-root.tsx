import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import Routes from '../../../../../constants/navigation/Routes';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import { shouldNavigateConfirmationModal } from '../../utils/confirm';
import { useTransactionMetadataRequest } from '../../hooks/transactions/useTransactionMetadataRequest';

export const ConfirmRoot = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const transactionMetadata = useTransactionMetadataRequest();
  const navigation = useNavigation();

  useEffect(() => {
    if (!approvalRequest) {
      return;
    }

    if (
      !shouldNavigateConfirmationModal(
        approvalRequest.type,
        transactionMetadata,
        isFullScreenConfirmation,
      )
    ) {
      return;
    }

    navigation.navigate(Routes.CONFIRMATION_REQUEST_MODAL);
  }, [
    approvalRequest,
    isFullScreenConfirmation,
    navigation,
    transactionMetadata,
  ]);

  return null;
};
