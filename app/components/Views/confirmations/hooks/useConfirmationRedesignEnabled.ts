import { useMemo } from 'react';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import useApprovalRequest from './useApprovalRequest';

const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const {
    type: approvalRequestType,
    requestData: { version: approvalRequestVersion },
  } = approvalRequest ?? { requestData: {} };

  const isRedesignedEnabled = useMemo(
    () =>
      approvalRequestType &&
      process.env.REDESIGNED_SIGNATURE_REQUEST === 'true' &&
      (approvalRequestType === ApprovalTypes.PERSONAL_SIGN ||
        (approvalRequestType === ApprovalTypes.ETH_SIGN_TYPED_DATA &&
          approvalRequestVersion === 'V1')),
    [approvalRequestType, approvalRequestVersion],
  );

  return { isRedesignedEnabled };
};

export default useConfirmationRedesignEnabled;
