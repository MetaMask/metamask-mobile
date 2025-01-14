import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import useApprovalRequest from './useApprovalRequest';

const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const { confirmation_redesign } = useSelector(selectRemoteFeatureFlags);

  const { type: approvalRequestType } = approvalRequest ?? {
    requestData: {},
  };

  const isRedesignedEnabled = useMemo(
    () =>
      (confirmation_redesign as Record<string, string>)?.signatures &&
      process.env.REDESIGNED_SIGNATURE_REQUEST === 'true' &&
      approvalRequestType &&
      [ApprovalTypes.PERSONAL_SIGN, ApprovalTypes.ETH_SIGN_TYPED_DATA].includes(
        approvalRequestType as ApprovalTypes,
      ),
    [approvalRequestType, confirmation_redesign],
  );

  return { isRedesignedEnabled };
};

export default useConfirmationRedesignEnabled;
