import { useNavigation } from '@react-navigation/native';
import { useEffect } from 'react';

import Routes from '../../../../../constants/navigation/Routes';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { useFullScreenConfirmation } from '../../hooks/ui/useFullScreenConfirmation';
import { isRedesignedConfirmationType } from '../../utils/confirm';

export const ConfirmRoot = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isFullScreenConfirmation } = useFullScreenConfirmation();
  const navigation = useNavigation();

  useEffect(() => {
    if (!approvalRequest) {
      return;
    }

    if (!isRedesignedConfirmationType(approvalRequest.type)) {
      return;
    }

    if (isFullScreenConfirmation) {
      return;
    }

    navigation.navigate(Routes.CONFIRMATION_REQUEST_MODAL);
  }, [approvalRequest, isFullScreenConfirmation, navigation]);

  return null;
};
