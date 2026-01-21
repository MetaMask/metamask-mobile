import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import Routes from '../../../../../constants/navigation/Routes';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';

export const ConfirmRoot = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const navigation = useNavigation();

  useEffect(() => {
    // Don't navigate if there's no pending approval
    if (!approvalRequest) {
      return;
    }

    // Don't navigate for full screen confirmations (e.g., staking)
    if (isFullScreenConfirmation) {
      return;
    }

    // Navigate to modal confirmation for non-full-screen confirmations
    navigation.navigate(Routes.CONFIRMATION_REQUEST_MODAL);
  }, [approvalRequest, isFullScreenConfirmation, navigation]);

  return null;
};
