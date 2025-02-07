import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';
import { isExternalHardwareAccount } from '../../../../util/address';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import useApprovalRequest from './useApprovalRequest';

export const useConfirmationRedesignEnabled = () => {
  const { approvalRequest } = useApprovalRequest();
  const { confirmation_redesign } = useSelector(selectRemoteFeatureFlags);

  const approvalRequestType = approvalRequest?.type;
  const fromAddress = approvalRequest?.requestData?.from;

  const isRedesignedEnabled = useMemo(
    () =>
      (confirmation_redesign as Record<string, string>)?.signatures &&
      // following condition will ensure that user is redirected to old designs for ledger
      !isExternalHardwareAccount(fromAddress) &&
      approvalRequestType &&
      [ApprovalTypes.PERSONAL_SIGN, ApprovalTypes.ETH_SIGN_TYPED_DATA].includes(
        approvalRequestType as ApprovalTypes,
      ),
    [approvalRequestType, confirmation_redesign, fromAddress],
  );

  return { isRedesignedEnabled };
};
