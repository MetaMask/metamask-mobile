import React, { useCallback } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import SignatureRequestRoot from '../../Views/confirmations/components/SignatureRequest/Root';

const SignatureApproval = () => {
  const { approvalRequest, onReject, onConfirm } = useApprovalRequest();

  const onSignConfirm = useCallback(async () => {
    await onConfirm({
      waitForResult: true,
      //@ts-expect-error - this is added via patch of approval controller
      deleteAfterResult: true,
      handleErrors: false,
    });
  }, [onConfirm]);

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
      onSignConfirm={onSignConfirm}
      onSignReject={onReject}
    />
  );
};

export default SignatureApproval;
