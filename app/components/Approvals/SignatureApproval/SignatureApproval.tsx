import React, { useCallback, useEffect } from 'react';
import useApprovalRequest from '../../Views/confirmations/hooks/useApprovalRequest';
import { ApprovalTypes } from '../../../core/RPCMethods/RPCMethodMiddleware';
import SignatureRequestRoot from '../../Views/confirmations/legacy/components/SignatureRequest/Root';
import { endTrace, TraceName } from '../../../util/trace';

const SignatureApproval = () => {
  const { approvalRequest, onReject, onConfirm } = useApprovalRequest();
  const signatureRequestId = approvalRequest?.requestData?.requestId;

  const onSignConfirm = useCallback(async () => {
    await onConfirm({
      waitForResult: true,
      deleteAfterResult: true,
      handleErrors: false,
    });
  }, [onConfirm]);

  useEffect(() => {
    endTrace({
      name: TraceName.NotificationDisplay,
      id: signatureRequestId,
    });
  }, [signatureRequestId]);

  const messageParams =
    approvalRequest &&
    [ApprovalTypes.PERSONAL_SIGN, ApprovalTypes.ETH_SIGN_TYPED_DATA].includes(
      approvalRequest.type as ApprovalTypes,
    )
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
