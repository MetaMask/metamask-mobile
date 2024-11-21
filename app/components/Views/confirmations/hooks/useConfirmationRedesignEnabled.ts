import { useMemo } from 'react';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import useApprovalRequest from './useApprovalRequest';

const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();

  const { type: approvalRequestType } = approvalRequest ?? {
    requestData: {},
  };

  const isRedesignedEnabled = useMemo(
    () =>
      approvalRequestType &&
      process.env.REDESIGNED_SIGNATURE_REQUEST === 'true' &&
      approvalRequestType === ApprovalTypes.PERSONAL_SIGN,
    [approvalRequestType],
  );

  return { isRedesignedEnabled };
};

export default useConfirmationRedesignEnabled;
