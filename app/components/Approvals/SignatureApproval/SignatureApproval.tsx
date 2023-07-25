import React, { useCallback } from 'react';
import useApprovalRequest from '../../hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import SignatureRequestRoot from '../../UI/SignatureRequest/Root';

const SignatureApproval = () => {
  const { approvalRequest } = useApprovalRequest();

  const onSign = useCallback(() => undefined, []);

  const messageParams =
    approvalRequest &&
    [
      ApprovalTypes.ETH_SIGN,
      ApprovalTypes.PERSONAL_SIGN,
      ApprovalTypes.ETH_SIGN_TYPED_DATA,
    ].includes(approvalRequest.type as ApprovalTypes)
      ? approvalRequest?.requestData
      : undefined;

  return (
    <SignatureRequestRoot
      messageParams={messageParams}
      approvalType={approvalRequest?.type}
      onSign={onSign}
    />
  );
};

export default SignatureApproval;
