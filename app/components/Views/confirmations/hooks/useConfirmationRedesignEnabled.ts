import { useMemo } from 'react';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import useApprovalRequest from './useApprovalRequest';
import useQRHardwareAwareness from './useQRHardwareAwareness';

const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const { isSigningQRObject, isSyncingQRHardware } = useQRHardwareAwareness();

  const { type: approvalRequestType } = approvalRequest ?? {
    requestData: {},
  };

  const isRedesignedEnabled = useMemo(
    () =>
      !isSyncingQRHardware &&
      !isSigningQRObject &&
      approvalRequestType &&
      [ApprovalTypes.PERSONAL_SIGN, ApprovalTypes.ETH_SIGN_TYPED_DATA].includes(
        approvalRequestType as ApprovalTypes,
      ),
    [approvalRequestType, isSyncingQRHardware, isSigningQRObject],
  );

  return { isRedesignedEnabled };
};

export default useConfirmationRedesignEnabled;
