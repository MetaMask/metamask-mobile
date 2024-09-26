import { useMemo } from 'react';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import useApprovalRequest from '../hooks/useApprovalRequest';

const useRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const approvalRequestType = approvalRequest?.type;

  const isRedesignedEnabled = useMemo(
    () =>
      approvalRequestType &&
      process.env.REDESIGNED_SIGNATURE_REQUEST === 'true' &&
      approvalRequestType === ApprovalTypes.PERSONAL_SIGN,
    [approvalRequestType],
  );

  return { isRedesignedEnabled };
};

export default useRedesignEnabled;
